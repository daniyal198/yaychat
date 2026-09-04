/**
 * Mock service layer tests — critical frontend flows (Milestone 1 test plan).
 */
import {
  ApiError,
  authService,
  chatService,
  communityService,
  aiService,
  earnService,
  inviteService,
  userService,
  walletService,
  simulation,
  setSimulatedOffline,
  ME_ID,
} from '../src/yaychat/services';
import {deviceContacts} from '../src/yaychat/services/deviceContacts';

beforeAll(() => {
  simulation.latencyMs = 0;
});

afterEach(() => {
  setSimulatedOffline(false);
  simulation.failNextRequest = null;
});

describe('authService', () => {
  it('rejects invalid email on sign in', async () => {
    await expect(authService.signIn('not-an-email', 'password123')).rejects.toMatchObject({
      code: 'validation',
    });
  });

  it('rejects the simulated wrong password', async () => {
    await expect(authService.signIn('a@b.com', 'wrongpass')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('signs in and returns an onboarded session', async () => {
    const session = await authService.signIn('a@b.com', 'password123');
    expect(session.token).toBeTruthy();
    expect(session.onboarded).toBe(true);
    expect(session.user.id).toBe(ME_ID);
  });

  it('signs in with a phone number and returns an onboarded session', async () => {
    const session = await authService.signInWithPhone('+1 415 555 0117', 'password123');
    expect(session.token).toBeTruthy();
    expect(session.onboarded).toBe(true);
    // Canonicalised to E.164 before it reaches the backend: spacing must not
    // make one number look like two accounts.
    expect(session.user.phone).toBe('+14155550117');
  });

  it('normalises every spelling of a number to the same E.164 identity', async () => {
    // The bug this guards: a member registers as +14155550117, later types the
    // number with spaces or brackets, and the phone lookup reports it as
    // unregistered because the two strings differ.
    const spellings = ['+1 415 555 0117', '+1 (415) 555-0117', '+14155550117'];
    const phones = await Promise.all(
      spellings.map(async spelling => {
        const session = await authService.signInWithPhone(spelling, 'password123');
        return session.user.phone;
      }),
    );
    expect(new Set(phones).size).toBe(1);
    expect(phones[0]).toBe('+14155550117');
  });

  it('sign up returns a non-onboarded session', async () => {
    const session = await authService.signUp({
      method: 'email',
      name: 'Test User',
      email: 'test@example.com',
      profilePic: 'file:///profile.jpg',
      password: 'password123',
    });
    expect(session.onboarded).toBe(false);
    expect(session.user.name).toBe('Test User');
    expect(session.user.email).toBe('test@example.com');
    expect(session.user.profilePic).toBe('file:///profile.jpg');
  });

  it('allows sign up with a phone number instead of an email', async () => {
    const session = await authService.signUp({
      method: 'phone',
      name: 'Test User',
      phone: '+1 555 010 0199',
      password: 'password123',
    });
    expect(session.onboarded).toBe(false);
    expect(session.user.name).toBe('Test User');
    expect(session.user.phone).toBe('+1 555 010 0199');
  });

  it('rejects an invalid phone number during phone sign up', async () => {
    await expect(
      authService.signUp({
        method: 'phone',
        name: 'Test User',
        phone: '123',
        password: 'password123',
      }),
    ).rejects.toMatchObject({code: 'validation'});
  });

  it('verifies only the preview code 123456', async () => {
    await expect(authService.verifyCode('000000')).rejects.toBeInstanceOf(ApiError);
    await expect(authService.verifyCode('123456')).resolves.toBeUndefined();
  });

  it('validates the password reset code and new password', async () => {
    await expect(
      authService.resetPassword('a@b.com', '000000', 'newpassword123'),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      authService.resetPassword('a@b.com', '123456', 'short'),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      authService.resetPassword('a@b.com', '123456', 'newpassword123'),
    ).resolves.toBeUndefined();
  });

  it('validates usernames', async () => {
    await expect(authService.checkUsername('Bad Name!')).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(authService.checkUsername('taken')).resolves.toEqual({available: false});
    await expect(authService.checkUsername('jordan_r')).resolves.toEqual({available: true});
  });
});

describe('chatService', () => {
  it('lists non-archived conversations with pinned first', async () => {
    const list = await chatService.listConversations('all');
    expect(list.length).toBeGreaterThan(0);
    expect(list.every(c => !c.archived)).toBe(true);
    expect(list[0].pinned).toBe(true);
    expect(list[0].lastMessage).toBeTruthy();
  });

  it('filters archived conversations', async () => {
    const archived = await chatService.listConversations('archived');
    expect(archived.every(c => c.archived)).toBe(true);
  });

  it('sends a message and appends it to the conversation', async () => {
    const before = await chatService.getMessages('c_amara');
    const sent = await chatService.sendMessage('c_amara', {text: 'Hello from tests'});
    expect(sent.senderId).toBe(ME_ID);
    expect(sent.status).toBe('sent');
    const after = await chatService.getMessages('c_amara');
    expect(after.items.length).toBe(before.items.length + 1);
  });

  it('deduplicates retries with the same client id', async () => {
    const clientId = `jest-client-${Date.now()}`;
    const first = await chatService.sendMessage('c_amara', {
      text: 'Retry-safe hello',
      clientId,
    });
    const retry = await chatService.sendMessage('c_amara', {
      text: 'Retry-safe hello',
      clientId,
    });
    const page = await chatService.getMessages('c_amara');

    expect(retry.id).toBe(first.id);
    expect(page.items.filter(m => m.clientId === clientId)).toHaveLength(1);
  });

  it('emits conversation-scoped chat events', async () => {
    const events: string[] = [];
    const unsubscribe = chatService.subscribeConversation('c_amara', event => {
      events.push(event.type);
    });

    await chatService.setTyping('c_amara', 'u_amara', true);
    const incoming = await chatService.simulateIncomingMessage('c_amara', {
      senderId: 'u_amara',
      text: 'Incoming test message',
    });
    await chatService.setTyping('c_amara', 'u_amara', false);
    unsubscribe();

    expect(incoming.senderId).toBe('u_amara');
    expect(events).toContain('typing.changed');
    expect(events).toContain('message.upsert');
    expect(events).toContain('conversation.updated');
  });

  it('rejects empty messages and simulated failures', async () => {
    await expect(chatService.sendMessage('c_amara', {text: '   '})).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(chatService.sendMessage('c_amara', {text: 'oops #fail'})).rejects.toMatchObject({
      code: 'server',
    });
  });

  it('toggles reactions on and off', async () => {
    const page = await chatService.getMessages('c_amara');
    const target = page.items[0];
    const withReaction = await chatService.toggleReaction('c_amara', target.id, '🔥');
    expect(withReaction.reactions.some(r => r.emoji === '🔥' && r.userIds.includes(ME_ID))).toBe(true);
    const without = await chatService.toggleReaction('c_amara', target.id, '🔥');
    expect(without.reactions.some(r => r.emoji === '🔥' && r.userIds.includes(ME_ID))).toBe(false);
  });

  it('reuses the existing direct conversation for the same contact', async () => {
    const convo = await chatService.createConversation(['u_amara']);
    expect(convo.id).toBe('c_amara');
  });

  it('creates a group with the caller as owner', async () => {
    const convo = await chatService.createConversation(['u_amara', 'u_liu'], 'Test Group');
    expect(convo.type).toBe('group');
    expect(convo.groupRoles?.[ME_ID]).toBe('owner');
  });

  it('paginates message history', async () => {
    const first = await chatService.getMessages('c_group_indexx');
    expect(first.items.length).toBeLessThanOrEqual(30);
    if (first.nextCursor) {
      const second = await chatService.getMessages('c_group_indexx', first.nextCursor);
      expect(second.items.length).toBeGreaterThan(0);
    }
  });

  it('keeps pagination stable after newer messages arrive', async () => {
    const first = await chatService.getMessages('c_group_indexx');
    if (!first.nextCursor) {
      return;
    }

    const clientId = `jest-pagination-${Date.now()}`;
    await chatService.sendMessage('c_group_indexx', {
      text: 'Newest message while paging',
      clientId,
    });
    const older = await chatService.getMessages('c_group_indexx', first.nextCursor);

    expect(older.items.some(m => m.clientId === clientId)).toBe(false);
    expect(older.items[older.items.length - 1]?.id).not.toBe(first.items[0].id);
  });

  it('searches messages across conversations', async () => {
    const results = await chatService.searchMessages('streak');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].message.text.toLowerCase()).toContain('streak');
  });
});

describe('communityService', () => {
  it('filters discovery by category and query', async () => {
    const design = await communityService.discover('Design');
    expect(design.every(c => c.category === 'Design')).toBe(true);
    const byQuery = await communityService.discover(undefined, 'btcy');
    expect(byQuery.some(c => c.name === 'BTCY Learners')).toBe(true);
  });

  it('joins a public community immediately', async () => {
    const joined = await communityService.join('co_design');
    expect(joined.joined).toBe(true);
    await communityService.leave('co_design');
  });

  it('creates a join request for private communities', async () => {
    const requested = await communityService.join('co_traders');
    expect(requested.joined).toBe(false);
    expect(requested.joinRequested).toBe(true);
    expect(requested.joinRequests?.some(r => r.status === 'pending')).toBe(true);
  });

  it('rejects joining invite-only communities', async () => {
    await expect(communityService.join('co_invite')).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('creates a community with the creator as admin', async () => {
    const c = await communityService.create({
      name: 'Testers United',
      category: 'Learning',
      description: 'A test community',
      privacy: 'public',
    });
    expect(c.role).toBe('admin');
    expect(c.joined).toBe(true);
  });

  // M3: the author of a post comes from the session, never from the caller —
  // a client that could name itself could sign a post as "BTCY Official".
  it('attributes a new feed post to the signed-in account', async () => {
    const me = await userService.me();
    const community = await communityService.postToFeed(
      'co_btcy',
      'Post from registered profile',
    );
    expect(community.feed[0].authorName).toBe(me.name);
    expect(community.feed[0].mine).toBe(true);
  });

  // M3: a second vote is refused rather than silently ignored, so the UI can
  // say why nothing happened.
  it('records a poll vote exactly once and refuses the second', async () => {
    const community = await communityService.get('co_btcy');
    const poll = community.polls[0];
    const votesBefore = poll.options[0].votes;
    await communityService.vote('co_btcy', poll.id, 0);
    await expect(communityService.vote('co_btcy', poll.id, 0)).rejects.toMatchObject({
      code: 'validation',
    });
    const after = await communityService.get('co_btcy');
    expect(after.polls[0].options[0].votes).toBe(votesBefore + 1);
    expect(after.polls[0].votedIndex).toBe(0);
  });

  it('lets staff approve private community join requests', async () => {
    const c = await communityService.create({
      name: 'Private Review Room',
      category: 'Business',
      description: 'Private access test',
      privacy: 'private',
    });
    c.joinRequests = [
      {
        id: 'jr_test',
        userName: 'Applicant One',
        userEmail: 'applicant@example.com',
        requestedAt: new Date().toISOString(),
        status: 'pending',
      },
    ];
    const before = c.memberCount;
    const updated = await communityService.approveJoinRequest(c.id, 'jr_test', true);
    expect(updated.joinRequests?.[0].status).toBe('approved');
    expect(updated.memberCount).toBe(before + 1);
  });

  it('restricts official announcements to approved publishers', async () => {
    await expect(
      communityService.publishAnnouncement('co_design', {
        title: 'Unapproved update',
        body: 'This should not publish from a regular member.',
      }),
    ).rejects.toMatchObject({code: 'unauthorized'});
  });

  it('schedules targeted announcements and tracks reads', async () => {
    const c = await communityService.create({
      name: 'Announcement Ops',
      category: 'Business',
      description: 'Official update testing',
      privacy: 'public',
    });
    const scheduled = await communityService.publishAnnouncement(c.id, {
      title: 'Regional launch',
      body: 'Launch starts tomorrow morning.',
      scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
      audience: 'region',
      region: 'United States',
      actionLabel: 'Open details',
      actionUrl: 'mock-link://launch-details',
    });
    const announcement = scheduled.announcements[0];
    expect(announcement.status).toBe('scheduled');
    expect(announcement.region).toBe('United States');
    expect(announcement.actionUrl).toBe('mock-link://launch-details');
    const read = await communityService.readAnnouncement(c.id, announcement.id);
    expect(read.announcements[0].readCount).toBe(1);
  });

  it('stores moderation reports and lets staff resolve them', async () => {
    const c = await communityService.create({
      name: 'Moderation Ops',
      category: 'Learning',
      description: 'Report workflow testing',
      privacy: 'public',
    });
    const reported = await communityService.report(c.id, 'Spam');
    expect(reported.moderationReports?.[0].status).toBe('open');
    const resolved = await communityService.resolveReport(
      c.id,
      reported.moderationReports![0].id,
      'removed',
    );
    expect(resolved.moderationReports?.[0].status).toBe('removed');
    expect(resolved.moderationReports?.[0].assignedTo).toBeTruthy();
  });
});

describe('aiService', () => {
  it('starts a conversation and returns simulated replies', async () => {
    const convo = await aiService.start('ask', 'What is Yay-chat?');
    const updated = await aiService.send(convo.id, 'What is Yay-chat?');
    expect(updated.messages).toHaveLength(2);
    expect(updated.messages[1].role).toBe('assistant');
  });

  it('uses the profile name in generated email signatures', async () => {
    const convo = await aiService.start('email', 'Draft a follow-up email');
    const updated = await aiService.send(
      convo.id,
      'Draft a follow-up email',
      'email',
      'Registered Tester',
    );
    expect(updated.messages[1].text).toContain('Best,\nRegistered Tester');
    expect(updated.messages[1].text).not.toContain('Best,\nJordan');
  });

  it('counts one request against the daily quota per send', async () => {
    const before = (await aiService.usage()).usedRequests;
    const convo = await aiService.start('ask');
    await aiService.send(convo.id, 'hello');
    const after = (await aiService.usage()).usedRequests;
    expect(after).toBe(before + 1);
  });

  // A provider outage must degrade rather than fail the request — the answer
  // still arrives, flagged so the UI can say it came from the offline path.
  it('marks answers produced without a live provider as degraded', async () => {
    const convo = await aiService.start('ask');
    const updated = await aiService.send(convo.id, 'hello');
    expect(updated.messages[1].degraded).toBe(true);
    expect(aiService.providerStatus().live).toBe(false);
  });
});

describe('earnService', () => {
  it('allows exactly one daily check-in', async () => {
    const summary = await earnService.summary();
    const checked = await earnService.checkIn();
    expect(checked.checkedInToday).toBe(true);
    expect(checked.balance).toBe(summary.balance + 20);
    expect(checked.streakDays).toBe(summary.streakDays + 1);
    await expect(earnService.checkIn()).rejects.toMatchObject({code: 'validation'});
  });

  it('records the check-in in reward history', async () => {
    const history = await earnService.history();
    expect(history[0].activity).toBe('Daily check-in');
    expect(history[0].status).toBe('completed');
  });
});

describe('inviteService', () => {
  it('finds an existing account by email, case-insensitively', async () => {
    const result = await inviteService.lookupEmail('AMARA@example.com');
    expect(result.exists).toBe(true);
    expect(result.user?.name).toBe('Amara Okafor');
  });

  it('reports no account for an email nobody has', async () => {
    const result = await inviteService.lookupEmail('nobody-here@example.com');
    expect(result.exists).toBe(false);
    expect(result.user).toBeUndefined();
  });

  it('never calls the backend for a query that is not a full email address', async () => {
    const result = await inviteService.lookupEmail('amara');
    expect(result.exists).toBe(false);
  });

  it('never returns an empty contact list as an error', async () => {
    // The device address book is empty in this environment (no native
    // permission to grant) — that must read as "nothing to invite", not fail.
    const result = await inviteService.findFromContacts();
    expect(result).toEqual({onYaysApp: [], invitable: []});
  });
});

describe('deviceContacts permission mapping', () => {
  it('keeps "never asked" distinct from "denied"', async () => {
    expect(await deviceContacts.permissionStatus()).toBe('undetermined');
  });
});

describe('wallet previews', () => {
  it('only exposes preview data', async () => {
    const assets = await walletService.assets();
    expect(assets.every(a => a.preview)).toBe(true);
    const txs = await walletService.transactions();
    expect(txs.every(t => t.status === 'preview')).toBe(true);
  });
});

describe('transport simulation', () => {
  it('raises offline errors when offline mode is on', async () => {
    setSimulatedOffline(true);
    await expect(chatService.listConversations()).rejects.toMatchObject({code: 'offline'});
  });

  it('fails exactly one request when failNextRequest is set', async () => {
    simulation.failNextRequest = 'server';
    await expect(chatService.listConversations()).rejects.toMatchObject({code: 'server'});
    await expect(chatService.listConversations()).resolves.toBeTruthy();
  });
});
