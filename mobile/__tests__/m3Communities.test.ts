/**
 * Module 3 — communities and announcements.
 *
 * Exercises the contract every screen depends on, through `communityService`,
 * on the local engine (the path a build without the M3 backend takes — and the
 * one these tests can run without a server). The rules covered here are the
 * ones the acceptance criteria name: private-community enforcement, roles and
 * permissions, the publishing-approval workflow, scheduling and targeting,
 * read analytics, invite links, banning, and impersonation detection.
 */
import {ApiError, communityService, simulation} from '../src/yaychat/services';
import {
  detectImpersonation,
  foldName,
  localCommunities,
  parseInviteCode,
  resetLocalCommunities,
} from '../src/yaychat/services/communities/localEngine';
import * as db from '../src/yaychat/services/mock/db';

const ME = () => db.userById(db.ME_ID);

/** A community this account owns, created fresh for each test that needs one. */
const createOwned = async (overrides: Partial<{name: string; privacy: 'public' | 'private'}> = {}) =>
  communityService.create({
    name: overrides.name ?? `Test Community ${Math.random().toString(36).slice(2, 8)}`,
    category: 'Other',
    description: 'A community created by the test suite.',
    privacy: overrides.privacy ?? 'public',
  });

/** The seeded community this account has *not* joined. */
const strangerCommunityId = () => {
  const community = db.communities.find(item => !item.joined && !item.inviteOnly);
  if (!community) {
    throw new Error('mock db no longer seeds an unjoined community');
  }
  return community.id;
};

let seedSnapshot: string;

beforeAll(() => {
  simulation.latencyMs = 0;
  seedSnapshot = JSON.stringify(db.communities);
});

beforeEach(() => {
  // The engine mutates `db.communities` in place, so restore the seed between
  // tests rather than letting one test's joins leak into the next.
  db.communities.length = 0;
  db.communities.push(...JSON.parse(seedSnapshot));
  resetLocalCommunities();
});

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

describe('communities adapter', () => {
  it('serves locally when the backend is not enabled', async () => {
    await expect(communityService.backendLive()).resolves.toBe(false);
  });

  it('still exposes a category list and report reasons', async () => {
    const categories = await communityService.loadCatalog();
    expect(categories).toContain('All');
    expect(communityService.reportReasons()).toContain('Impersonation');
  });

  it('discovers, filters by category, and searches by name', async () => {
    const all = await communityService.discover();
    expect(all.length).toBeGreaterThan(0);

    const design = await communityService.discover('Design');
    expect(design.every(c => c.category === 'Design')).toBe(true);

    const searched = await communityService.discover(undefined, 'btcy');
    expect(searched.some(c => c.name.toLowerCase().includes('btcy'))).toBe(true);
  });

  it('lists only joined communities under "mine"', async () => {
    const mine = await communityService.myCommunities();
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every(c => c.joined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

describe('joining and leaving', () => {
  it('joins a public community instantly', async () => {
    const id = strangerCommunityId();
    const joined = await communityService.join(id);
    expect(joined.joined).toBe(true);
    expect(joined.role).toBe('member');
  });

  it('raises a request instead of joining a private community', async () => {
    const created = await createOwned({privacy: 'private'});
    // Simulate a stranger's view of it by dropping our own membership.
    await communityService.leave(created.id);
    const requested = await communityService.join(created.id);
    expect(requested.joined).toBe(false);
    expect(requested.joinRequested).toBe(true);
    expect(requested.joinRequests?.some(r => r.status === 'pending')).toBe(true);
  });

  it('refuses to join an invite-only community', async () => {
    const created = await createOwned();
    await communityService.update(created.id, {inviteOnly: true});
    await communityService.leave(created.id);
    await expect(communityService.join(created.id)).rejects.toBeInstanceOf(ApiError);
  });

  it('leaves a community and drops the role with it', async () => {
    const id = strangerCommunityId();
    await communityService.join(id);
    await communityService.leave(id);
    const after = await communityService.get(id);
    expect(after.joined).toBe(false);
    expect(after.role).toBeUndefined();
  });

  it('approves a join request and admits the requester', async () => {
    const created = await createOwned({privacy: 'private'});
    localCommunities.leave(created.id, ME());
    await communityService.join(created.id);
    const withRequest = await communityService.get(created.id);
    const request = withRequest.joinRequests?.find(r => r.status === 'pending');
    expect(request).toBeTruthy();

    // Restore staff rights to review it.
    localCommunities.addMember(created.id, ME(), 'admin');
    (await communityService.get(created.id)).role = 'admin';
    db.communities.find(c => c.id === created.id)!.role = 'admin';
    db.communities.find(c => c.id === created.id)!.joined = true;

    const decided = await communityService.approveJoinRequest(created.id, request!.id, true);
    expect(decided.joinRequests?.find(r => r.id === request!.id)?.status).toBe('approved');
  });
});

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

describe('permission enforcement', () => {
  it('refuses to post to a community this account has not joined', async () => {
    await expect(
      communityService.postToFeed(strangerCommunityId(), 'hello'),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('refuses to vote before joining', async () => {
    const community = await communityService.get(strangerCommunityId());
    const poll = community.polls[0];
    if (poll) {
      await expect(
        communityService.vote(community.id, poll.id, 0),
      ).rejects.toBeInstanceOf(ApiError);
    }
  });

  it('lets a member post, like, and remove their own post', async () => {
    const id = strangerCommunityId();
    await communityService.join(id);
    const posted = await communityService.postToFeed(id, 'First post from the tests');
    const post = posted.feed[0];
    expect(post.body).toBe('First post from the tests');
    expect(post.mine).toBe(true);

    const liked = await communityService.likePost(id, post.id);
    expect(liked).toEqual({liked: true, likes: 1});
    const unliked = await communityService.likePost(id, post.id);
    expect(unliked).toEqual({liked: false, likes: 0});

    const removed = await communityService.removePost(id, post.id);
    expect(removed.feed.some(item => item.id === post.id)).toBe(false);
  });

  it('refuses an empty post', async () => {
    const id = strangerCommunityId();
    await communityService.join(id);
    await expect(communityService.postToFeed(id, '   ')).rejects.toBeInstanceOf(ApiError);
  });

  it('only lets staff create polls and events', async () => {
    const id = strangerCommunityId();
    await communityService.join(id);
    await expect(
      communityService.createPoll(id, {question: 'Pizza?', options: ['Yes', 'No']}),
    ).rejects.toBeInstanceOf(ApiError);

    const owned = await createOwned();
    const withPoll = await communityService.createPoll(owned.id, {
      question: 'Pizza?',
      options: ['Yes', 'No'],
    });
    expect(withPoll.polls[0].question).toBe('Pizza?');
  });

  it('refuses a poll with fewer than two options', async () => {
    const owned = await createOwned();
    await expect(
      communityService.createPoll(owned.id, {question: 'Only one?', options: ['Yes']}),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('counts a vote once and refuses the second', async () => {
    const owned = await createOwned();
    const withPoll = await communityService.createPoll(owned.id, {
      question: 'Pizza?',
      options: ['Yes', 'No'],
    });
    const pollId = withPoll.polls[0].id;
    const voted = await communityService.vote(owned.id, pollId, 0);
    expect(voted.polls[0].options[0].votes).toBe(1);
    expect(voted.polls[0].votedIndex).toBe(0);
    await expect(communityService.vote(owned.id, pollId, 1)).rejects.toBeInstanceOf(ApiError);
  });

  it("RSVPs to an event and takes the RSVP back", async () => {
    const owned = await createOwned();
    const withEvent = await communityService.createEvent(owned.id, {
      title: 'Community call',
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const event = withEvent.events[0];
    expect(event.going).toBe(true);

    const off = await communityService.rsvp(owned.id, event.id, false);
    expect(off.events[0].going).toBe(false);
    expect(off.events[0].attending).toBe(0);

    const on = await communityService.rsvp(owned.id, event.id, true);
    expect(on.events[0].attending).toBe(1);
  });

  it('refuses an event with an unparseable date', async () => {
    const owned = await createOwned();
    await expect(
      communityService.createEvent(owned.id, {title: 'Whenever', startsAt: 'soon'}),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Members, roles, bans
// ---------------------------------------------------------------------------

describe('members and moderation actions', () => {
  it('lists members with staff first', async () => {
    const owned = await createOwned();
    const members = await communityService.members(owned.id);
    expect(members.length).toBeGreaterThan(0);
    expect(members[0].role).toBe('admin');
  });

  it('filters members by name', async () => {
    const owned = await createOwned();
    const all = await communityService.members(owned.id);
    const target = all.find(member => member.role === 'member');
    const filtered = await communityService.members(owned.id, target!.name.slice(0, 4));
    expect(filtered.some(member => member.id === target!.id)).toBe(true);
  });

  it('promotes a member to moderator and back', async () => {
    const owned = await createOwned();
    const target = (await communityService.members(owned.id)).find(m => m.role === 'member')!;
    await communityService.setRole(owned.id, target.email, 'moderator');
    expect(
      (await communityService.members(owned.id)).find(m => m.email === target.email)?.role,
    ).toBe('moderator');

    await communityService.setRole(owned.id, target.email, 'member');
    expect(
      (await communityService.members(owned.id)).find(m => m.email === target.email)?.role,
    ).toBe('member');
  });

  it('bans a member, hides them from the active list, and unbans them', async () => {
    const owned = await createOwned();
    const target = (await communityService.members(owned.id)).find(m => m.role === 'member')!;

    await communityService.removeMember(owned.id, target.email, {
      ban: true,
      reason: 'Spam',
    });
    const afterBan = await communityService.members(owned.id);
    expect(afterBan.find(m => m.email === target.email)?.status).toBe('banned');
    expect(afterBan.filter(m => m.status === 'active').some(m => m.email === target.email)).toBe(
      false,
    );

    await communityService.unbanMember(owned.id, target.email);
    const afterUnban = await communityService.members(owned.id);
    expect(afterUnban.find(m => m.email === target.email)?.status).not.toBe('banned');
  });

  it('refuses moderation actions from a plain member', async () => {
    const id = strangerCommunityId();
    await communityService.join(id);
    const target = (await communityService.members(id)).find(m => m.role === 'member')!;
    await expect(
      communityService.removeMember(id, target.email, {ban: true}),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('keeps members private to a private community', async () => {
    const created = await createOwned({privacy: 'private'});
    await communityService.leave(created.id);
    await expect(communityService.members(created.id)).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Invite links
// ---------------------------------------------------------------------------

describe('invite links', () => {
  it('mints a link that carries the community slug and a code', async () => {
    const owned = await createOwned({name: 'Weekend Trail Runners'});
    const invite = await communityService.createInvite(owned.id);
    expect(invite.url).toContain('/c/weekend-trail-runners?i=');
    expect(invite.appUrl.startsWith('yaychat://community/')).toBe(true);
    expect(parseInviteCode(invite.url)).toBe(invite.code);
  });

  it('previews an invite before joining', async () => {
    const owned = await createOwned();
    const invite = await communityService.createInvite(owned.id);
    const preview = await communityService.previewInvite(invite.url);
    expect(preview.valid).toBe(true);
    expect(preview.community.id).toBe(owned.id);
  });

  it('gets a non-member into an invite-only community', async () => {
    const owned = await createOwned();
    const invite = await communityService.createInvite(owned.id);
    await communityService.update(owned.id, {inviteOnly: true});
    localCommunities.leave(owned.id, ME());

    const joined = await communityService.acceptInvite(invite.code);
    expect(joined.joined).toBe(true);
    expect((await communityService.listInvites(owned.id))[0].uses).toBe(1);
  });

  it('refuses a revoked link', async () => {
    const owned = await createOwned();
    const invite = await communityService.createInvite(owned.id);
    await communityService.revokeInvite(owned.id, invite.code);
    localCommunities.leave(owned.id, ME());

    const preview = await communityService.previewInvite(invite.code);
    expect(preview.valid).toBe(false);
    expect(preview.reason).toMatch(/revoked/i);
    await expect(communityService.acceptInvite(invite.code)).rejects.toBeInstanceOf(ApiError);
  });

  it('refuses an exhausted link', async () => {
    const owned = await createOwned();
    const invite = await communityService.createInvite(owned.id, {maxUses: 1});
    localCommunities.leave(owned.id, ME());
    await communityService.acceptInvite(invite.code);
    localCommunities.leave(owned.id, ME());

    await expect(communityService.acceptInvite(invite.code)).rejects.toBeInstanceOf(ApiError);
  });

  it('refuses an unknown code outright', async () => {
    await expect(communityService.acceptInvite('not-a-real-code')).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('does not let an invite bypass a ban', async () => {
    const owned = await createOwned();
    const invite = await communityService.createInvite(owned.id);
    // Ban this very account, then try to walk back in through the link.
    localCommunities.removeMember(owned.id, ME().email, {ban: true, reason: 'Spam'});
    localCommunities.leave(owned.id, ME());

    await expect(communityService.acceptInvite(invite.code)).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

describe('announcements', () => {
  const draft = {title: 'Roadmap update', body: 'Here is what is shipping next.'};

  it('publishes immediately from an unverified community', async () => {
    const owned = await createOwned();
    const updated = await communityService.publishAnnouncement(owned.id, draft);
    const announcement = updated.announcements[0];
    expect(announcement.status).toBe('published');
    expect(announcement.deliveredCount).toBeGreaterThan(0);
  });

  it('schedules a future announcement instead of sending it', async () => {
    const owned = await createOwned();
    const updated = await communityService.publishAnnouncement(owned.id, {
      ...draft,
      scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(updated.announcements[0].status).toBe('scheduled');
    expect(updated.announcements[0].deliveredCount).toBe(0);
  });

  it('publishes a scheduled announcement once its time passes', async () => {
    const owned = await createOwned();
    await communityService.publishAnnouncement(owned.id, {
      ...draft,
      scheduledFor: new Date(Date.now() + 1_000).toISOString(),
    });
    // Move the schedule into the past, then re-read: the sweep runs on read.
    const stored = db.communities.find(c => c.id === owned.id)!;
    stored.announcements[0].scheduledFor = new Date(Date.now() - 1_000).toISOString();

    const after = await communityService.get(owned.id);
    expect(after.announcements[0].status).toBe('published');
    expect(after.announcements[0].deliveredCount).toBeGreaterThan(0);
  });

  it('treats a past schedule as publish-now', async () => {
    const owned = await createOwned();
    const updated = await communityService.publishAnnouncement(owned.id, {
      ...draft,
      scheduledFor: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(updated.announcements[0].status).toBe('published');
  });

  it('requires a region for a region-targeted announcement', async () => {
    const owned = await createOwned();
    await expect(
      communityService.publishAnnouncement(owned.id, {...draft, audience: 'region'}),
    ).rejects.toBeInstanceOf(ApiError);

    const ok = await communityService.publishAnnouncement(owned.id, {
      ...draft,
      audience: 'region',
      region: 'Nigeria',
    });
    expect(ok.announcements[0].region).toBe('Nigeria');
  });

  it('requires an action label and link together', async () => {
    const owned = await createOwned();
    await expect(
      communityService.publishAnnouncement(owned.id, {
        ...draft,
        actionUrl: 'mock-link://thing',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('refuses a title or body that is too short', async () => {
    const owned = await createOwned();
    await expect(
      communityService.publishAnnouncement(owned.id, {title: 'hi', body: 'long enough'}),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('refuses a publisher who is neither staff nor approved', async () => {
    const id = strangerCommunityId();
    await communityService.join(id);
    await expect(
      communityService.publishAnnouncement(id, draft),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('holds an official community announcement for approval', async () => {
    // The seeded BTCY community is verified; this account is only a member on
    // its approved-publisher list, which is exactly the workflow's target case.
    const official = db.communities.find(c => c.verified && c.joined)!;
    official.role = 'member';
    const updated = await communityService.publishAnnouncement(official.id, draft);
    const pending = updated.announcements[0];
    expect(pending.status).toBe('pending_approval');
    expect(pending.deliveredCount).toBe(0);
  });

  it('lets an admin approve a held announcement, but not its own publisher', async () => {
    const official = db.communities.find(c => c.verified && c.joined)!;
    official.role = 'member';
    const held = (await communityService.publishAnnouncement(official.id, draft))
      .announcements[0];

    // The publisher (this account) is now an admin — self-approval is refused.
    db.communities.find(c => c.id === official.id)!.role = 'admin';
    await expect(
      communityService.approveAnnouncement(official.id, held.id, true),
    ).rejects.toBeInstanceOf(ApiError);

    // A different admin approves it.
    db.communities.find(c => c.id === official.id)!.announcements[0].publisherName =
      'Another Admin';
    const approved = await communityService.approveAnnouncement(official.id, held.id, true);
    expect(approved.announcements[0].status).toBe('published');
    expect(approved.announcements[0].approvedBy).toBeTruthy();
  });

  it('records a rejection with its reason', async () => {
    const official = db.communities.find(c => c.verified && c.joined)!;
    official.role = 'member';
    const held = (await communityService.publishAnnouncement(official.id, draft))
      .announcements[0];
    const stored = db.communities.find(c => c.id === official.id)!;
    stored.role = 'admin';
    stored.announcements[0].publisherName = 'Another Admin';

    const rejected = await communityService.approveAnnouncement(
      official.id,
      held.id,
      false,
      'Off-brand copy',
    );
    expect(rejected.announcements[0].status).toBe('rejected');
    expect(rejected.announcements[0].rejectedReason).toBe('Off-brand copy');
  });

  it('counts a read once per reader, however many times it is opened', async () => {
    const owned = await createOwned();
    const published = await communityService.publishAnnouncement(owned.id, draft);
    const id = published.announcements[0].id;

    const first = await communityService.readAnnouncement(owned.id, id);
    expect(first.announcements[0].readCount).toBe(1);
    expect(first.announcements[0].readByMe).toBe(true);

    const second = await communityService.readAnnouncement(owned.id, id);
    expect(second.announcements[0].readCount).toBe(1);
  });

  it('reports read analytics with a bounded rate', async () => {
    const owned = await createOwned();
    const published = await communityService.publishAnnouncement(owned.id, draft);
    const id = published.announcements[0].id;
    await communityService.readAnnouncement(owned.id, id);

    const stats = await communityService.announcementStats(owned.id, id);
    expect(stats.reads).toBe(1);
    expect(stats.delivered).toBeGreaterThan(0);
    expect(stats.readRate).toBeGreaterThan(0);
    expect(stats.readRate).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Reporting and moderation
// ---------------------------------------------------------------------------

describe('reporting and moderation', () => {
  it('files a community report and shows it in the queue', async () => {
    const owned = await createOwned();
    const reported = await communityService.report(owned.id, 'Spam');
    expect(reported.moderationReports?.[0].reason).toBe('Spam');
    expect(reported.moderationReports?.[0].status).toBe('open');
  });

  it('does not queue the same open report twice', async () => {
    const owned = await createOwned();
    await communityService.report(owned.id, 'Spam');
    const again = await communityService.report(owned.id, 'Spam');
    expect(again.moderationReports?.length).toBe(1);
  });

  it('removes the reported post when a moderator resolves with "removed"', async () => {
    const owned = await createOwned();
    const posted = await communityService.postToFeed(owned.id, 'Something questionable');
    const postId = posted.feed[0].id;
    const reported = await communityService.report(owned.id, 'Spam', {
      targetType: 'post',
      targetId: postId,
    });
    const reportId = reported.moderationReports![0].id;

    const resolved = await communityService.resolveReport(owned.id, reportId, 'removed');
    expect(resolved.feed.some(item => item.id === postId)).toBe(false);
    expect(resolved.moderationReports?.find(r => r.id === reportId)?.status).toBe('removed');
  });

  it('refuses report resolution from a non-moderator', async () => {
    const id = strangerCommunityId();
    await communityService.join(id);
    const reported = await communityService.report(id, 'Spam');
    const reportId = reported.moderationReports![0].id;
    await expect(
      communityService.resolveReport(id, reportId, 'dismissed'),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Impersonation
// ---------------------------------------------------------------------------

describe('impersonation detection', () => {
  it('folds lookalike characters onto their letters', () => {
    expect(foldName('B1tc0in Yay')).toBe(foldName('Bitcoin Yay'));
  });

  it('flags a lookalike of a verified community at creation', async () => {
    const verified = db.communities.find(c => c.verified)!;
    const flags = detectImpersonation(verified.name.replace(/o/gi, '0'));
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[0].matchedCommunityId).toBe(verified.id);
  });

  it('attaches the flags to a newly created community without blocking it', async () => {
    const verified = db.communities.find(c => c.verified)!;
    const created = await communityService.create({
      name: `${verified.name} Official Support`,
      category: 'Other',
      description: 'Definitely not the real one.',
      privacy: 'public',
    });
    expect(created.id).toBeTruthy();
    expect(created.impersonationFlags?.length).toBeGreaterThan(0);
    expect(created.impersonationFlags?.[0].reason).toBe('official_term');
  });

  it('leaves an unrelated name alone', () => {
    expect(detectImpersonation('Weekend Trail Runners')).toEqual([]);
  });

  it('refuses to create a duplicate community name outright', async () => {
    const existing = db.communities[0];
    await expect(
      communityService.create({
        name: existing.name,
        category: 'Other',
        description: 'Duplicate.',
        privacy: 'public',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Community chat
// ---------------------------------------------------------------------------

describe('community chat', () => {
  it('has no live conversation id while served locally', async () => {
    const owned = await createOwned();
    expect(communityService.chatConversationId(owned)).toBeNull();
  });

  it('maps a backing chat group onto an M2 group conversation id', () => {
    expect(
      communityService.chatConversationId({
        ...db.communities[0],
        chatGroupId: 'group-uuid-1234',
      }),
    ).toBe('group:group-uuid-1234');
  });
});
