/**
 * Local communities engine.
 *
 * Implements exactly the contract `communityService` expects from
 * `/api/v1/yays/communities`, so the Communities tab is fully functional in the
 * two situations the backend cannot cover:
 *
 *  - preview builds running with `YAYCHAT_USE_BACKEND=false`;
 *  - a deployed backend that does not yet serve the M3 routes (the adapter
 *    detects the 404 once and routes here for the rest of the session).
 *
 * The rules that matter — roles, the publishing-approval workflow, invite
 * expiry, announcement scheduling and read counting, impersonation flags — are
 * reproduced here rather than stubbed, so the same behaviour is exercised in
 * either mode.
 */
import type {
  Community,
  CommunityAnnouncement,
  CommunityInvite,
  CommunityMember,
  ImpersonationFlag,
  AnnouncementStats,
  User,
} from '../../types/models';
import {ApiError} from '../client';
import * as db from '../mock/db';

// ---------------------------------------------------------------------------
// Local-only state (per session, alongside the seeded `db.communities`)
// ---------------------------------------------------------------------------

interface LocalMemberRow {
  communityId: string;
  email: string;
  name: string;
  username: string;
  profilePic?: string;
  role: 'admin' | 'moderator' | 'member';
  status: 'active' | 'banned' | 'left' | 'removed';
  joinedAt: string;
  banReason?: string;
}

interface LocalInvite extends CommunityInvite {
  communityId: string;
}

const members: LocalMemberRow[] = [];
const invites: LocalInvite[] = [];
/** announcementId → readers, so a re-read cannot inflate the count. */
const announcementReaders = new Map<string, Set<string>>();
let seeded = false;

const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const nextCode = (): string => {
  let code = '';
  for (let i = 0; i < 12; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
};

const meUser = (): User => db.userById(db.ME_ID);

const emailOf = (user: {email?: string; id?: string}): string =>
  String(user.email || user.id || '').trim().toLowerCase();

/**
 * Seed a plausible member list for every seeded community, drawn from the mock
 * contacts, so the members screen has something real to page through.
 */
const seed = () => {
  if (seeded) {
    return;
  }
  seeded = true;
  const contacts = db.users.filter(user => user.id !== db.ME_ID);
  for (const community of db.communities) {
    contacts.slice(0, 8).forEach((user, index) => {
      members.push({
        communityId: community.id,
        email: emailOf(user),
        name: user.name,
        username: user.username,
        profilePic: user.profilePic,
        role: index === 0 ? 'admin' : index === 1 ? 'moderator' : 'member',
        status: 'active',
        joinedAt: new Date(Date.now() - (index + 1) * 86_400_000).toISOString(),
      });
    });
    if (community.joined) {
      members.push({
        communityId: community.id,
        email: emailOf(meUser()),
        name: meUser().name,
        username: meUser().username,
        profilePic: meUser().profilePic,
        role: community.role === 'admin' ? 'admin' : community.role === 'moderator' ? 'moderator' : 'member',
        status: 'active',
        joinedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      });
    }
  }
};

/** Test hook — forgets every local mutation made during a session. */
export const resetLocalCommunities = () => {
  members.length = 0;
  invites.length = 0;
  announcementReaders.clear();
  seeded = false;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const find = (communityId: string): Community => {
  const community = db.communities.find(item => item.id === communityId);
  if (!community) {
    throw new ApiError('Community not found.', 'not_found');
  }
  return community;
};

const isStaff = (community: Community): boolean =>
  community.role === 'admin' || community.role === 'moderator';

const isAdmin = (community: Community): boolean => community.role === 'admin';

const canPublish = (community: Community, actor: User): boolean =>
  isAdmin(community) ||
  (community.approvedPublisherIds ?? []).includes(actor.id) ||
  (community.approvedPublisherIds ?? []).includes(emailOf(actor));

const requireJoined = (community: Community, message: string) => {
  if (!community.joined) {
    throw new ApiError(message, 'unauthorized');
  }
};

const requireStaff = (community: Community, message: string) => {
  if (!isStaff(community)) {
    throw new ApiError(message, 'unauthorized');
  }
};

const memberRows = (communityId: string): LocalMemberRow[] => {
  seed();
  return members.filter(row => row.communityId === communityId);
};

const memberRow = (communityId: string, email: string): LocalMemberRow | undefined =>
  memberRows(communityId).find(row => row.email === email.trim().toLowerCase());

const activeCount = (communityId: string): number =>
  memberRows(communityId).filter(row => row.status === 'active').length;

/** Mirror of the server's fold: digits and lookalikes collapse onto letters. */
const CONFUSABLES: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  l: 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's',
  '|': 'i',
  '!': 'i',
};

export const foldName = (name: string): string =>
  Array.from(String(name || '').toLowerCase())
    .map(char => CONFUSABLES[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]/g, '');

const OFFICIAL_TERMS = ['official', 'verified', 'support', 'admin', 'team', 'hq'];

const editDistance = (a: string, b: string): number => {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }
  let previous = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
};

/** Local twin of `backend/services/communities/impersonation.ts`. */
export const detectImpersonation = (
  candidateName: string,
  candidateId?: string,
): ImpersonationFlag[] => {
  const folded = foldName(candidateName);
  if (!folded) {
    return [];
  }
  const claimsOfficial = OFFICIAL_TERMS.some(term =>
    candidateName.toLowerCase().includes(term),
  );
  const flags: ImpersonationFlag[] = [];
  for (const community of db.communities) {
    if (!community.verified || community.id === candidateId) {
      continue;
    }
    const matchFolded = foldName(community.name);
    const longest = Math.max(folded.length, matchFolded.length) || 1;
    const score = 1 - editDistance(folded, matchFolded) / longest;
    const productFolded = foldName(community.officialProduct || '');
    let reason: ImpersonationFlag['reason'] | null = null;
    if (candidateName.trim().toLowerCase() === community.name.trim().toLowerCase()) {
      reason = 'exact';
    } else if (folded === matchFolded) {
      reason = 'confusable';
    } else if (score >= 0.82) {
      reason = 'normalized';
    } else if (
      claimsOfficial &&
      ((productFolded && folded.includes(productFolded)) || folded.includes(matchFolded))
    ) {
      reason = 'official_term';
    }
    if (reason) {
      flags.push({
        matchedCommunityId: community.id,
        matchedName: community.name,
        score: Number(score.toFixed(3)),
        reason,
      });
    }
  }
  return flags.sort((a, b) => b.score - a.score);
};

/** Publish any scheduled announcement whose time has come. */
const publishDue = (community: Community) => {
  const now = Date.now();
  for (const announcement of community.announcements) {
    if (
      announcement.status === 'scheduled' &&
      announcement.scheduledFor &&
      new Date(announcement.scheduledFor).getTime() <= now
    ) {
      announcement.status = 'published';
      announcement.postedAt = new Date().toISOString();
      announcement.deliveredCount =
        announcement.deliveredCount || Math.max(1, activeCount(community.id));
    }
  }
};

/** The shape screens read. Mirrors the server's detail payload. */
const decorate = (community: Community): Community => {
  publishDue(community);
  const actor = meUser();
  community.memberCount = Math.max(community.memberCount, activeCount(community.id));
  community.canPublishAnnouncement = community.joined && canPublish(community, actor);
  community.canModerate = isStaff(community);
  community.bannedUserIds = memberRows(community.id)
    .filter(row => row.status === 'banned')
    .map(row => row.email);
  community.chatGroupId = community.chatGroupId || `mock-${community.id}`;
  return community;
};

// ---------------------------------------------------------------------------
// The engine
// ---------------------------------------------------------------------------

export const localCommunities = {
  categories: (): string[] => db.communityCategories,

  discover(category?: string, query?: string): Community[] {
    let list = [...db.communities];
    if (category && category !== 'All') {
      list = list.filter(community => community.category === category);
    }
    if (query?.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        community =>
          community.name.toLowerCase().includes(q) ||
          community.description.toLowerCase().includes(q),
      );
    }
    return list.map(decorate);
  },

  mine(): Community[] {
    return db.communities.filter(community => community.joined).map(decorate);
  },

  get(id: string): Community {
    return decorate(find(id));
  },

  join(id: string, actor: User): Community {
    const community = find(id);
    if (memberRow(id, emailOf(actor))?.status === 'banned') {
      throw new ApiError('You are banned from this community.', 'unauthorized');
    }
    if (community.inviteOnly) {
      throw new ApiError('This community is invite-only.', 'unauthorized');
    }
    if (community.privacy === 'private') {
      community.joinRequested = true;
      community.joinRequests = community.joinRequests ?? [];
      const existing = community.joinRequests.find(
        request => request.userEmail === actor.email && request.status === 'pending',
      );
      if (!existing) {
        community.joinRequests.unshift({
          id: db.nextId('jr'),
          userName: actor.name,
          userEmail: actor.email,
          requestedAt: new Date().toISOString(),
          status: 'pending',
        });
      }
      return decorate(community);
    }
    if (!community.joined) {
      community.joined = true;
      community.role = 'member';
      community.memberCount += 1;
      this.addMember(community.id, actor, 'member');
    }
    return decorate(community);
  },

  leave(id: string, actor: User): void {
    const community = db.communities.find(item => item.id === id);
    if (!community || !community.joined) {
      return;
    }
    community.joined = false;
    community.role = undefined;
    community.memberCount = Math.max(0, community.memberCount - 1);
    const row = memberRow(id, emailOf(actor));
    // A ban survives leaving. Downgrading it here would let anyone escape a ban
    // by leaving first and walking back in through an invite link.
    if (row && row.status === 'active') {
      row.status = 'left';
    }
  },

  addMember(
    communityId: string,
    user: User,
    role: 'admin' | 'moderator' | 'member',
  ): void {
    seed();
    const email = emailOf(user);
    const existing = memberRow(communityId, email);
    if (existing) {
      existing.status = 'active';
      existing.role = role;
      return;
    }
    members.push({
      communityId,
      email,
      name: user.name,
      username: user.username,
      profilePic: user.profilePic,
      role,
      status: 'active',
      joinedAt: new Date().toISOString(),
    });
  },

  members(communityId: string, query?: string): CommunityMember[] {
    const community = find(communityId);
    if (community.privacy === 'private' && !community.joined) {
      throw new ApiError('Join this community to see its members.', 'unauthorized');
    }
    const q = String(query || '').trim().toLowerCase();
    const rank = {admin: 0, moderator: 1, member: 2} as const;
    return memberRows(communityId)
      .filter(row => row.status === 'active' || (isStaff(community) && row.status === 'banned'))
      .filter(row =>
        q
          ? row.name.toLowerCase().includes(q) ||
            row.username.toLowerCase().includes(q) ||
            row.email.includes(q)
          : true,
      )
      .map(row => ({
        id: row.email,
        email: row.email,
        name: row.name,
        username: row.username,
        profilePic: row.profilePic,
        role: row.role,
        status: row.status,
        joinedAt: row.joinedAt,
        banReason: row.banReason,
      }))
      .sort((a, b) => rank[a.role ?? 'member'] - rank[b.role ?? 'member'] || a.name.localeCompare(b.name));
  },

  setRole(
    communityId: string,
    email: string,
    role: 'admin' | 'moderator' | 'member',
  ): Community {
    const community = find(communityId);
    if (!isAdmin(community)) {
      throw new ApiError('Only admins can change roles.', 'unauthorized');
    }
    const row = memberRow(communityId, email);
    if (!row || row.status !== 'active') {
      throw new ApiError('That person is not a member.', 'not_found');
    }
    row.role = role;
    return decorate(community);
  },

  removeMember(
    communityId: string,
    email: string,
    options: {ban?: boolean; reason?: string} = {},
  ): Community {
    const community = find(communityId);
    requireStaff(community, 'Only admins and moderators can remove members.');
    const row = memberRow(communityId, email);
    if (!row) {
      throw new ApiError('That person is not a member.', 'not_found');
    }
    if (row.role === 'admin' && !isAdmin(community)) {
      throw new ApiError('You cannot act on that member.', 'unauthorized');
    }
    row.status = options.ban ? 'banned' : 'removed';
    row.banReason = options.ban ? options.reason : undefined;
    community.memberCount = Math.max(0, community.memberCount - 1);
    return decorate(community);
  },

  unban(communityId: string, email: string): Community {
    const community = find(communityId);
    requireStaff(community, 'Only admins and moderators can lift a ban.');
    const row = memberRow(communityId, email);
    if (row) {
      row.status = 'left';
      row.banReason = undefined;
    }
    return decorate(community);
  },

  create(
    input: {name: string; category: string; description: string; privacy: 'public' | 'private'},
    actor: User,
  ): {community: Community; impersonationFlags: ImpersonationFlag[]} {
    const name = input.name.trim();
    if (name.length < 3) {
      throw new ApiError('Community name must be at least 3 characters.', 'validation');
    }
    if (db.communities.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError('A community with that name already exists.', 'validation');
    }
    const impersonationFlags = detectImpersonation(name);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const community: Community = {
      id: db.nextId('co'),
      slug,
      name,
      category: input.category,
      description: input.description.trim(),
      memberCount: 1,
      privacy: input.privacy,
      joined: true,
      role: 'admin',
      approvedPublisherIds: [actor.id, emailOf(actor)],
      joinRequests: [],
      moderationReports: [],
      bannedUserIds: [],
      rules: ['Be kind.'],
      announcements: [],
      events: [],
      polls: [],
      feed: [],
      inviteLink: `https://yay.chat/c/${slug}`,
      impersonationFlags,
    };
    db.communities.unshift(community);
    this.addMember(community.id, actor, 'admin');
    return {community: decorate(community), impersonationFlags};
  },

  update(
    id: string,
    input: Partial<Pick<Community, 'name' | 'description' | 'rules' | 'category' | 'privacy' | 'inviteOnly'>>,
  ): {community: Community; impersonationFlags: ImpersonationFlag[]} {
    const community = find(id);
    if (!isAdmin(community)) {
      throw new ApiError('Only admins can edit this community.', 'unauthorized');
    }
    const renamed =
      typeof input.name === 'string' && input.name.trim() && input.name.trim() !== community.name;
    Object.assign(community, input);
    const impersonationFlags = renamed ? detectImpersonation(community.name, community.id) : [];
    community.impersonationFlags = impersonationFlags;
    return {community: decorate(community), impersonationFlags};
  },

  // -------------------------------------------------------------------------
  // Invites
  // -------------------------------------------------------------------------

  createInvite(
    communityId: string,
    options: {maxUses?: number | null; expiresInHours?: number | null} = {},
  ): CommunityInvite {
    const community = find(communityId);
    requireJoined(community, 'Join this community before inviting others.');
    const invite: LocalInvite = {
      communityId,
      code: nextCode(),
      url: '',
      appUrl: '',
      maxUses: options.maxUses ?? null,
      uses: 0,
      expiresAt:
        options.expiresInHours && options.expiresInHours > 0
          ? new Date(Date.now() + options.expiresInHours * 3_600_000).toISOString()
          : null,
      revoked: false,
    };
    const slug = community.slug || community.inviteLink.split('/').pop() || communityId;
    invite.url = `https://yay.chat/c/${slug}?i=${invite.code}`;
    invite.appUrl = `yaychat://community/${slug}?i=${invite.code}`;
    invites.unshift(invite);
    return {...invite};
  },

  listInvites(communityId: string): CommunityInvite[] {
    find(communityId);
    return invites
      .filter(invite => invite.communityId === communityId)
      .map(invite => ({...invite}));
  },

  revokeInvite(communityId: string, code: string): void {
    const invite = invites.find(
      item => item.communityId === communityId && item.code === code,
    );
    if (!invite) {
      throw new ApiError('Invite not found.', 'not_found');
    }
    invite.revoked = true;
  },

  previewInvite(rawCode: string): {community: Community; valid: boolean; reason?: string} {
    const {invite, community} = this.resolveInvite(rawCode);
    const reason = inviteRejection(invite);
    return {community: decorate(community), valid: !reason, reason};
  },

  acceptInvite(rawCode: string, actor: User): Community {
    const {invite, community} = this.resolveInvite(rawCode);
    if (memberRow(community.id, emailOf(actor))?.status === 'banned') {
      throw new ApiError('You are banned from this community.', 'unauthorized');
    }
    if (community.joined) {
      return decorate(community);
    }
    const reason = inviteRejection(invite);
    if (reason) {
      throw new ApiError(reason, 'validation');
    }
    invite.uses += 1;
    community.joined = true;
    community.joinRequested = false;
    community.role = 'member';
    community.memberCount += 1;
    this.addMember(community.id, actor, 'member');
    return decorate(community);
  },

  resolveInvite(rawCode: string): {invite: LocalInvite; community: Community} {
    const code = parseInviteCode(rawCode);
    const invite = code ? invites.find(item => item.code === code) : undefined;
    if (!invite) {
      throw new ApiError('That invite link is not valid.', 'not_found');
    }
    return {invite, community: find(invite.communityId)};
  },

  // -------------------------------------------------------------------------
  // Feed, polls, events
  // -------------------------------------------------------------------------

  post(communityId: string, body: string, actor: User): Community {
    const community = find(communityId);
    requireJoined(community, 'Join this community to post.');
    if (!body.trim()) {
      throw new ApiError('Post cannot be empty.', 'validation');
    }
    community.feed.unshift({
      id: db.nextId('fp'),
      authorName: actor.name,
      authorId: emailOf(actor),
      body: body.trim(),
      postedAt: new Date().toISOString(),
      likes: 0,
      liked: false,
      mine: true,
    });
    return decorate(community);
  },

  likePost(communityId: string, postId: string): {liked: boolean; likes: number} {
    const community = find(communityId);
    requireJoined(community, 'Join this community to react to posts.');
    const post = community.feed.find(item => item.id === postId);
    if (!post) {
      throw new ApiError('Post not found.', 'not_found');
    }
    post.liked = !post.liked;
    post.likes = Math.max(0, post.likes + (post.liked ? 1 : -1));
    return {liked: !!post.liked, likes: post.likes};
  },

  removePost(communityId: string, postId: string): Community {
    const community = find(communityId);
    const post = community.feed.find(item => item.id === postId);
    if (!post) {
      throw new ApiError('Post not found.', 'not_found');
    }
    if (!post.mine && !isStaff(community)) {
      throw new ApiError('You cannot remove that post.', 'unauthorized');
    }
    community.feed = community.feed.filter(item => item.id !== postId);
    return decorate(community);
  },

  createPoll(
    communityId: string,
    input: {question: string; options: string[]; closesInHours?: number},
  ): Community {
    const community = find(communityId);
    requireStaff(community, 'Only admins and moderators can create polls.');
    const options = input.options.map(option => option.trim()).filter(Boolean);
    if (!input.question.trim()) {
      throw new ApiError('A poll needs a question.', 'validation');
    }
    if (options.length < 2) {
      throw new ApiError('A poll needs at least two options.', 'validation');
    }
    community.polls.unshift({
      id: db.nextId('po'),
      question: input.question.trim(),
      options: options.map(label => ({label, votes: 0})),
      closesAt: new Date(
        Date.now() + (input.closesInHours ?? 48) * 3_600_000,
      ).toISOString(),
    });
    return decorate(community);
  },

  vote(communityId: string, pollId: string, optionIndex: number): Community {
    const community = find(communityId);
    requireJoined(community, 'Join this community to vote.');
    const poll = community.polls.find(item => item.id === pollId);
    if (!poll) {
      throw new ApiError('Poll not found.', 'not_found');
    }
    if (new Date(poll.closesAt).getTime() <= Date.now()) {
      throw new ApiError('This poll has closed.', 'validation');
    }
    if (!poll.options[optionIndex]) {
      throw new ApiError('That poll option does not exist.', 'validation');
    }
    if (poll.votedIndex !== undefined) {
      throw new ApiError('You already voted in this poll.', 'validation');
    }
    poll.options[optionIndex].votes += 1;
    poll.votedIndex = optionIndex;
    return decorate(community);
  },

  createEvent(
    communityId: string,
    input: {title: string; description?: string; startsAt: string; location?: string},
  ): Community {
    const community = find(communityId);
    requireStaff(community, 'Only admins and moderators can create events.');
    if (!input.title.trim()) {
      throw new ApiError('An event needs a title.', 'validation');
    }
    const startsAt = new Date(input.startsAt);
    if (!Number.isFinite(startsAt.getTime())) {
      throw new ApiError('That event date is not valid.', 'validation');
    }
    community.events.unshift({
      id: db.nextId('ev'),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      date: startsAt.toISOString(),
      location: input.location?.trim() || undefined,
      attending: 1,
      going: true,
    });
    return decorate(community);
  },

  rsvp(communityId: string, eventId: string, attending: boolean): Community {
    const community = find(communityId);
    requireJoined(community, 'Join this community to RSVP.');
    const event = community.events.find(item => item.id === eventId);
    if (!event) {
      throw new ApiError('Event not found.', 'not_found');
    }
    if (!!event.going !== attending) {
      event.going = attending;
      event.attending = Math.max(0, event.attending + (attending ? 1 : -1));
    }
    return decorate(community);
  },

  // -------------------------------------------------------------------------
  // Announcements
  // -------------------------------------------------------------------------

  publishAnnouncement(
    communityId: string,
    input: {
      title: string;
      body: string;
      scheduledFor?: string;
      audience?: 'all' | 'members' | 'region';
      region?: string;
      actionLabel?: string;
      actionUrl?: string;
    },
    actor: User,
  ): Community {
    const community = find(communityId);
    if (!canPublish(community, actor)) {
      throw new ApiError(
        'Only approved publishers can post official announcements.',
        'unauthorized',
      );
    }
    if (input.title.trim().length < 3 || input.body.trim().length < 5) {
      throw new ApiError('Announcement needs a title and message.', 'validation');
    }
    const audience = input.audience ?? 'members';
    if (audience === 'region' && !input.region?.trim()) {
      throw new ApiError('Choose a region for region-targeted announcements.', 'validation');
    }
    const scheduledDate = input.scheduledFor?.trim()
      ? new Date(input.scheduledFor)
      : null;
    if (scheduledDate && !Number.isFinite(scheduledDate.getTime())) {
      throw new ApiError('The scheduled time is not a valid date.', 'validation');
    }
    const scheduled = !!scheduledDate && scheduledDate.getTime() > Date.now();
    if (!!input.actionUrl?.trim() !== !!input.actionLabel?.trim()) {
      throw new ApiError('An action button needs both a label and a link.', 'validation');
    }

    // The approval workflow bites only on official (verified) communities and
    // only for publishers who are not admins — the server rule, mirrored.
    const status: CommunityAnnouncement['status'] =
      community.verified && !isAdmin(community)
        ? 'pending_approval'
        : scheduled
        ? 'scheduled'
        : 'published';

    community.announcements.unshift({
      id: db.nextId('an'),
      title: input.title.trim(),
      body: input.body.trim(),
      postedAt: new Date().toISOString(),
      status,
      scheduledFor: scheduled ? scheduledDate!.toISOString() : undefined,
      audience,
      region: audience === 'region' ? input.region?.trim() : undefined,
      actionLabel: input.actionLabel?.trim() || undefined,
      actionUrl: input.actionUrl?.trim() || undefined,
      readCount: 0,
      deliveredCount: status === 'published' ? Math.max(1, activeCount(communityId)) : 0,
      readByMe: false,
      publisherName: actor.name,
      publisherVerified: Boolean(community.verified),
      approvedBy: isAdmin(community) ? actor.name : undefined,
    });
    return decorate(community);
  },

  approveAnnouncement(
    communityId: string,
    announcementId: string,
    approve: boolean,
    reason: string | undefined,
    actor: User,
  ): Community {
    const community = find(communityId);
    if (!isAdmin(community)) {
      throw new ApiError('Only admins can approve official announcements.', 'unauthorized');
    }
    const announcement = community.announcements.find(item => item.id === announcementId);
    if (!announcement) {
      throw new ApiError('Announcement not found.', 'not_found');
    }
    if (announcement.status !== 'pending_approval') {
      throw new ApiError('That announcement is not awaiting approval.', 'validation');
    }
    if (announcement.publisherName === actor.name) {
      throw new ApiError(
        'An announcement must be approved by someone other than its publisher.',
        'unauthorized',
      );
    }
    if (!approve) {
      announcement.status = 'rejected';
      announcement.rejectedReason = reason || 'No reason given.';
      return decorate(community);
    }
    const scheduled =
      !!announcement.scheduledFor &&
      new Date(announcement.scheduledFor).getTime() > Date.now();
    announcement.status = scheduled ? 'scheduled' : 'published';
    announcement.approvedBy = actor.name;
    if (!scheduled) {
      announcement.postedAt = new Date().toISOString();
      announcement.deliveredCount = Math.max(1, activeCount(communityId));
    }
    return decorate(community);
  },

  readAnnouncement(
    communityId: string,
    announcementId: string,
    actor: User,
  ): Community {
    const community = find(communityId);
    const announcement = community.announcements.find(item => item.id === announcementId);
    if (!announcement) {
      throw new ApiError('Announcement not found.', 'not_found');
    }
    const readers = announcementReaders.get(announcementId) ?? new Set<string>();
    const email = emailOf(actor);
    if (!readers.has(email)) {
      readers.add(email);
      announcementReaders.set(announcementId, readers);
      announcement.readCount = (announcement.readCount ?? 0) + 1;
      announcement.readByMe = true;
    }
    return decorate(community);
  },

  announcementStats(communityId: string, announcementId: string): AnnouncementStats {
    const community = find(communityId);
    const announcement = community.announcements.find(item => item.id === announcementId);
    if (!announcement) {
      throw new ApiError('Announcement not found.', 'not_found');
    }
    const delivered = announcement.deliveredCount ?? 0;
    const reads = announcement.readCount ?? 0;
    return {
      announcementId,
      status: announcement.status ?? 'published',
      audience: announcement.audience ?? 'members',
      region: announcement.region,
      delivered,
      reads,
      actioned: 0,
      readRate: delivered > 0 ? Number(Math.min(1, reads / delivered).toFixed(3)) : 0,
      scheduledFor: announcement.scheduledFor,
      publishedAt: announcement.status === 'published' ? announcement.postedAt : undefined,
    };
  },

  // -------------------------------------------------------------------------
  // Join requests, reporting, moderation
  // -------------------------------------------------------------------------

  decideJoinRequest(communityId: string, requestId: string, approve: boolean): Community {
    const community = find(communityId);
    requireStaff(community, 'Only admins and moderators can review join requests.');
    const request = community.joinRequests?.find(item => item.id === requestId);
    if (!request) {
      throw new ApiError('Join request not found.', 'not_found');
    }
    if (request.status === 'pending') {
      request.status = approve ? 'approved' : 'rejected';
      if (approve) {
        community.memberCount += 1;
        members.push({
          communityId,
          email: request.userEmail.toLowerCase(),
          name: request.userName,
          username: request.userEmail.split('@')[0],
          role: 'member',
          status: 'active',
          joinedAt: new Date().toISOString(),
        });
      }
    }
    return decorate(community);
  },

  report(
    communityId: string,
    input: {
      reason: string;
      targetType?: 'community' | 'post' | 'member' | 'announcement';
      targetId?: string;
      excerpt?: string;
    },
    actor: User,
  ): Community {
    const community = find(communityId);
    community.moderationReports = community.moderationReports ?? [];
    const targetType = input.targetType ?? 'community';
    const already = community.moderationReports.find(
      item =>
        item.status === 'open' &&
        item.targetType === targetType &&
        item.targetId === input.targetId &&
        item.reporterName === actor.name,
    );
    if (already) {
      return decorate(community);
    }
    community.moderationReports.unshift({
      id: db.nextId('rep'),
      targetType,
      targetId: input.targetId,
      reporterName: actor.name,
      reason: input.reason,
      excerpt:
        input.excerpt ||
        (targetType === 'community'
          ? `Reported ${community.name}`
          : `Reported a ${targetType}`),
      createdAt: new Date().toISOString(),
      status: 'open',
    });
    return decorate(community);
  },

  resolveReport(
    communityId: string,
    reportId: string,
    resolution: 'approved' | 'removed' | 'dismissed',
    actor: User,
  ): Community {
    const community = find(communityId);
    requireStaff(community, 'Only admins and moderators can resolve reports.');
    const report = community.moderationReports?.find(item => item.id === reportId);
    if (!report) {
      throw new ApiError('Report not found.', 'not_found');
    }
    report.status = resolution;
    report.assignedTo = actor.name;
    // "Removed" is a decision, not a label: carry it through to the content.
    if (resolution === 'removed' && report.targetType === 'post' && report.targetId) {
      community.feed = community.feed.filter(item => item.id !== report.targetId);
    }
    return decorate(community);
  },
};

/** Why this invite cannot be used, or `undefined` when it can. */
const inviteRejection = (invite: CommunityInvite): string | undefined => {
  if (invite.revoked) {
    return 'This invite link was revoked.';
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    return 'This invite link has expired.';
  }
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
    return 'This invite link has already been used the maximum number of times.';
  }
  return undefined;
};

/** Mirror of the server's parser: accepts either link form or a bare code. */
export const parseInviteCode = (input: string): string | null => {
  const raw = String(input || '').trim();
  if (!raw) {
    return null;
  }
  const fromQuery = raw.match(/[?&]i=([a-z0-9]+)/i);
  if (fromQuery) {
    return fromQuery[1].toLowerCase();
  }
  return /^[a-z0-9]{6,32}$/i.test(raw) ? raw.toLowerCase() : null;
};
