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
  walletService,
  simulation,
  setSimulatedOffline,
  ME_ID,
} from '../src/yaychat/services';

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

  it('sign up returns a non-onboarded session', async () => {
    const session = await authService.signUp({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(session.onboarded).toBe(false);
    expect(session.user.name).toBe('Test User');
  });

  it('verifies only the preview code 123456', async () => {
    await expect(authService.verifyCode('000000')).rejects.toBeInstanceOf(ApiError);
    await expect(authService.verifyCode('123456')).resolves.toBeUndefined();
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

  it('records a poll vote exactly once', async () => {
    const community = await communityService.get('co_btcy');
    const poll = community.polls[0];
    const votesBefore = poll.options[0].votes;
    await communityService.vote('co_btcy', poll.id, 0);
    await communityService.vote('co_btcy', poll.id, 0);
    const after = await communityService.get('co_btcy');
    expect(after.polls[0].options[0].votes).toBe(votesBefore + 1);
    expect(after.polls[0].votedIndex).toBe(0);
  });
});

describe('aiService', () => {
  it('starts a conversation and returns simulated replies', async () => {
    const convo = await aiService.start('ask', 'What is Yay-chat?');
    const updated = await aiService.send(convo.id, 'What is Yay-chat?');
    expect(updated.messages).toHaveLength(2);
    expect(updated.messages[1].role).toBe('assistant');
  });

  it('consumes credits per send', async () => {
    const before = (await aiService.usage()).usedCredits;
    const convo = await aiService.start('ask');
    await aiService.send(convo.id, 'hello');
    const after = (await aiService.usage()).usedCredits;
    expect(after).toBe(before + 1);
  });

  it('simulates provider unavailability', async () => {
    const convo = await aiService.start('ask');
    await expect(aiService.send(convo.id, 'test #unavailable')).rejects.toMatchObject({
      code: 'server',
    });
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
