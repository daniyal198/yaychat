/**
 * YaysApp mock service layer.
 *
 * This is the only module screens import for data. Signatures are designed to
 * survive the swap to real APIs in Milestones 2–3 (see
 * docs/yaychat-mock-api-contracts.md).
 */
import {ApiError, delay, mockRequest, secureTokenStore} from './client';
import * as db from './mock/db';
import {
  AiConversation,
  AiUsage,
  AppNotification,
  BtcyDashboard,
  EmmmDashboard,
  RehumanDashboard,
  ShoperpalDashboard,
  Community,
  Conversation,
  DeviceSession,
  EarnActivity,
  EarnSummary,
  EcosystemProduct,
  Message,
  Page,
  PaymentMethod,
  RewardEntry,
  Session,
  SettingsState,
  SocialAccount,
  User,
  WalletAsset,
  WalletTransaction,
} from '../types/models';

export {ApiError, errorMessage, isOfflineError, simulation, setSimulatedOffline, onOfflineChange, featureFlags, analytics} from './client';
export {ME_ID} from './mock/db';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authService = {
  async signIn(email: string, password: string): Promise<Session> {
    return mockRequest('auth.signIn', () => {
      if (!EMAIL_RE.test(email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
      if (password.length < 6) {
        throw new ApiError('Password must be at least 6 characters.', 'validation');
      }
      if (password === 'wrongpass') {
        throw new ApiError('Email or password is incorrect.', 'unauthorized');
      }
      const session: Session = {token: 'mock-token', user: db.userById(db.ME_ID), onboarded: true};
      secureTokenStore.save(JSON.stringify(session));
      return session;
    });
  },

  async signUp(input: {name: string; email: string; password: string}): Promise<Session> {
    return mockRequest('auth.signUp', () => {
      if (input.name.trim().length < 2) {
        throw new ApiError('Enter your name.', 'validation');
      }
      if (!EMAIL_RE.test(input.email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
      if (input.password.length < 8) {
        throw new ApiError('Password must be at least 8 characters.', 'validation');
      }
      const session: Session = {
        token: 'mock-token',
        user: {...db.userById(db.ME_ID), name: input.name, email: input.email},
        onboarded: false,
      };
      return session;
    });
  },

  async verifyCode(code: string): Promise<void> {
    return mockRequest('auth.verifyCode', () => {
      if (code !== '123456') {
        throw new ApiError('That code is not valid. In this preview build use 123456.', 'validation');
      }
    });
  },

  async requestPasswordReset(email: string): Promise<void> {
    return mockRequest('auth.requestPasswordReset', () => {
      if (!EMAIL_RE.test(email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
    });
  },

  async resetPassword(password: string): Promise<void> {
    return mockRequest('auth.resetPassword', () => {
      if (password.length < 8) {
        throw new ApiError('Password must be at least 8 characters.', 'validation');
      }
    });
  },

  async checkUsername(username: string): Promise<{available: boolean}> {
    return mockRequest('auth.checkUsername', () => {
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        throw new ApiError('Use 3–20 lowercase letters, numbers, or underscores.', 'validation');
      }
      return {available: !['admin', 'yaychat', 'taken'].includes(username)};
    });
  },

  async completeOnboarding(profile: {username: string; bio?: string}): Promise<Session> {
    return mockRequest('auth.completeOnboarding', () => {
      const me = db.userById(db.ME_ID);
      me.username = profile.username;
      if (profile.bio) {
        me.bio = profile.bio;
      }
      const session: Session = {token: 'mock-token', user: me, onboarded: true};
      secureTokenStore.save(JSON.stringify(session));
      return session;
    });
  },

  async restoreSession(): Promise<Session | null> {
    const raw = await secureTokenStore.load();
    await delay(300);
    return raw ? (JSON.parse(raw) as Session) : null;
  },

  async signOut(): Promise<void> {
    await secureTokenStore.clear();
  },

  async deleteAccount(): Promise<void> {
    return mockRequest('auth.deleteAccount', () => {
      secureTokenStore.clear();
    });
  },
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const sortConversations = (list: Conversation[]) =>
  [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    const at = a.lastMessage?.createdAt ?? '';
    const bt = b.lastMessage?.createdAt ?? '';
    return bt.localeCompare(at);
  });

const withLastMessage = (c: Conversation): Conversation => {
  const list = db.messages[c.id] ?? [];
  const visible = list.filter(m => !m.deleted);
  return {...c, lastMessage: visible[visible.length - 1]};
};

export const chatService = {
  async listConversations(filter: 'all' | 'unread' | 'groups' | 'archived' = 'all'): Promise<Conversation[]> {
    return mockRequest('chat.listConversations', () => {
      let list = db.conversations.map(withLastMessage);
      if (filter === 'archived') {
        list = list.filter(c => c.archived);
      } else {
        list = list.filter(c => !c.archived);
        if (filter === 'unread') {
          list = list.filter(c => c.unreadCount > 0);
        }
        if (filter === 'groups') {
          list = list.filter(c => c.type === 'group');
        }
      }
      return sortConversations(list);
    });
  },

  async getConversation(id: string): Promise<Conversation> {
    return mockRequest('chat.getConversation', () => {
      const c = db.conversations.find(x => x.id === id);
      if (!c) {
        throw new ApiError('Conversation not found.', 'not_found');
      }
      return withLastMessage(c);
    });
  },

  async getMessages(conversationId: string, cursor?: string): Promise<Page<Message>> {
    return mockRequest('chat.getMessages', () => {
      const all = db.messages[conversationId] ?? [];
      const pageSize = 30;
      const end = cursor ? Number(cursor) : all.length;
      const start = Math.max(0, end - pageSize);
      return {
        items: all.slice(start, end),
        nextCursor: start > 0 ? String(start) : null,
      };
    });
  },

  async sendMessage(
    conversationId: string,
    input: {text: string; kind?: Message['kind']; replyToId?: string; attachment?: Message['attachment']},
  ): Promise<Message> {
    return mockRequest(
      'chat.sendMessage',
      () => {
        if (input.text.trim().length === 0 && !input.attachment) {
          throw new ApiError('Message cannot be empty.', 'validation');
        }
        if (input.text.includes('#fail')) {
          throw new ApiError('Message failed to send.', 'server');
        }
        const message: Message = {
          id: db.nextId('m'),
          conversationId,
          senderId: db.ME_ID,
          kind: input.kind ?? 'text',
          text: input.text,
          createdAt: new Date().toISOString(),
          status: 'sent',
          replyToId: input.replyToId,
          reactions: [],
          attachment: input.attachment,
        };
        db.messages[conversationId] = [...(db.messages[conversationId] ?? []), message];
        return message;
      },
      {latencyMs: 350},
    );
  },

  async markRead(conversationId: string): Promise<void> {
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.unreadCount = 0;
    }
  },

  // Total unread across all active (non-archived) conversations — powers the
  // Chats tab badge and the home-screen Chats shortcut. Never throws so the
  // badge poller keeps working while offline.
  async getUnreadTotal(): Promise<number> {
    return db.conversations
      .filter(c => !c.archived)
      .reduce((sum, c) => sum + (c.unreadCount > 0 ? c.unreadCount : 0), 0);
  },

  async toggleReaction(conversationId: string, messageId: string, emoji: string): Promise<Message> {
    return mockRequest('chat.toggleReaction', () => {
      const m = (db.messages[conversationId] ?? []).find(x => x.id === messageId);
      if (!m) {
        throw new ApiError('Message not found.', 'not_found');
      }
      const existing = m.reactions.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.userIds.includes(db.ME_ID)) {
          existing.userIds = existing.userIds.filter(u => u !== db.ME_ID);
          if (existing.userIds.length === 0) {
            m.reactions = m.reactions.filter(r => r !== existing);
          }
        } else {
          existing.userIds.push(db.ME_ID);
        }
      } else {
        m.reactions.push({emoji, userIds: [db.ME_ID]});
      }
      return {...m};
    }, {latencyMs: 120});
  },

  async deleteMessage(conversationId: string, messageId: string, recall: boolean): Promise<void> {
    return mockRequest('chat.deleteMessage', () => {
      const m = (db.messages[conversationId] ?? []).find(x => x.id === messageId);
      if (m) {
        if (recall) {
          m.recalled = true;
          m.text = '';
        } else {
          m.deleted = true;
        }
      }
    });
  },

  /** Edits the text of the caller's own message. */
  async editMessage(conversationId: string, messageId: string, text: string): Promise<Message> {
    return mockRequest('chat.editMessage', () => {
      const m = (db.messages[conversationId] ?? []).find(x => x.id === messageId);
      if (!m) {
        throw new ApiError('Message not found.', 'not_found');
      }
      if (m.senderId !== db.ME_ID) {
        throw new ApiError('You can only edit your own messages.', 'unauthorized');
      }
      if (m.recalled || m.deleted) {
        throw new ApiError('This message can no longer be edited.', 'validation');
      }
      if (!text.trim()) {
        throw new ApiError('Message cannot be empty.', 'validation');
      }
      m.text = text.trim();
      m.edited = true;
      return {...m};
    });
  },

  /** Deletes a whole conversation and its message history (for this user). */
  async deleteConversation(conversationId: string): Promise<void> {
    return mockRequest('chat.deleteConversation', () => {
      const idx = db.conversations.findIndex(c => c.id === conversationId);
      if (idx === -1) {
        throw new ApiError('Chat not found.', 'not_found');
      }
      db.conversations.splice(idx, 1);
      delete db.messages[conversationId];
    });
  },

  async pinMessage(conversationId: string, messageId: string): Promise<void> {
    return mockRequest('chat.pinMessage', () => {
      // One pinned message per conversation: pinning a message unpins others.
      (db.messages[conversationId] ?? []).forEach(m => {
        m.pinned = m.id === messageId ? !m.pinned : false;
      });
    });
  },

  async forwardMessage(messageId: string, fromConversationId: string, toConversationIds: string[]): Promise<void> {
    return mockRequest('chat.forwardMessage', () => {
      const m = (db.messages[fromConversationId] ?? []).find(x => x.id === messageId);
      if (!m) {
        throw new ApiError('Message not found.', 'not_found');
      }
      toConversationIds.forEach(cid => {
        db.messages[cid] = [
          ...(db.messages[cid] ?? []),
          {...m, id: db.nextId('m'), conversationId: cid, senderId: db.ME_ID, createdAt: new Date().toISOString(), status: 'sent', reactions: [], pinned: false},
        ];
      });
    });
  },

  async setMuted(conversationId: string, muted: boolean): Promise<void> {
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.muted = muted;
    }
  },

  async setArchived(conversationId: string, archived: boolean): Promise<void> {
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.archived = archived;
    }
  },

  async setPinned(conversationId: string, pinned: boolean): Promise<void> {
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.pinned = pinned;
    }
  },

  async createConversation(memberIds: string[], title?: string, category?: string): Promise<Conversation> {
    return mockRequest('chat.createConversation', () => {
      if (memberIds.length === 0) {
        throw new ApiError('Pick at least one contact.', 'validation');
      }
      if (memberIds.length === 1) {
        const existing = db.conversations.find(
          c => c.type === 'direct' && c.memberIds.includes(memberIds[0]),
        );
        if (existing) {
          return withLastMessage(existing);
        }
      }
      const isGroup = memberIds.length > 1;
      const convo: Conversation = {
        id: db.nextId('c'),
        type: isGroup ? 'group' : 'direct',
        title: isGroup
          ? title?.trim() || 'New group'
          : db.userById(memberIds[0]).name,
        memberIds: [db.ME_ID, ...memberIds],
        unreadCount: 0,
        muted: false,
        pinned: false,
        archived: false,
        typingUserIds: [],
        groupRoles: isGroup ? {[db.ME_ID]: 'owner'} : undefined,
        category: isGroup ? category : undefined,
      };
      db.conversations.unshift(convo);
      db.messages[convo.id] = isGroup
        ? [{id: db.nextId('m'), conversationId: convo.id, senderId: db.ME_ID, kind: 'system', text: 'You created the group', createdAt: new Date().toISOString(), status: 'sent', reactions: []}]
        : [];
      return convo;
    });
  },

  async renameGroup(conversationId: string, title: string): Promise<void> {
    return mockRequest('chat.renameGroup', () => {
      const c = db.conversations.find(x => x.id === conversationId);
      if (!c) {
        throw new ApiError('Chat not found.', 'not_found');
      }
      if (!title.trim()) {
        throw new ApiError('Group name cannot be empty.', 'validation');
      }
      c.title = title.trim();
    });
  },

  async setGroupRole(conversationId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    return mockRequest('chat.setGroupRole', () => {
      const c = db.conversations.find(x => x.id === conversationId);
      if (!c || !c.groupRoles) {
        throw new ApiError('Group not found.', 'not_found');
      }
      if (c.groupRoles[userId] === 'owner') {
        throw new ApiError("The owner's role cannot be changed.", 'validation');
      }
      c.groupRoles[userId] = role;
    });
  },

  async removeGroupMember(conversationId: string, userId: string): Promise<void> {
    return mockRequest('chat.removeGroupMember', () => {
      const c = db.conversations.find(x => x.id === conversationId);
      if (!c) {
        throw new ApiError('Group not found.', 'not_found');
      }
      if (c.groupRoles?.[userId] === 'owner') {
        throw new ApiError('The owner cannot be removed.', 'validation');
      }
      c.memberIds = c.memberIds.filter(id => id !== userId);
      if (c.groupRoles) {
        delete c.groupRoles[userId];
      }
    });
  },

  async leaveGroup(conversationId: string): Promise<void> {
    return mockRequest('chat.leaveGroup', () => {
      const i = db.conversations.findIndex(x => x.id === conversationId);
      if (i >= 0) {
        db.conversations.splice(i, 1);
      }
    });
  },

  async searchMessages(query: string): Promise<{conversation: Conversation; message: Message}[]> {
    return mockRequest('chat.searchMessages', () => {
      if (!query.trim()) {
        return [];
      }
      const q = query.toLowerCase();
      const out: {conversation: Conversation; message: Message}[] = [];
      db.conversations.forEach(c => {
        (db.messages[c.id] ?? []).forEach(m => {
          if (!m.deleted && !m.recalled && m.text.toLowerCase().includes(q)) {
            out.push({conversation: c, message: m});
          }
        });
      });
      return out.slice(0, 30);
    });
  },
};

// ---------------------------------------------------------------------------
// Contacts / users
// ---------------------------------------------------------------------------

export const userService = {
  async me(): Promise<User> {
    return mockRequest('user.me', () => ({...db.userById(db.ME_ID)}));
  },

  async updateProfile(update: Partial<Pick<User, 'name' | 'bio' | 'username'>>): Promise<User> {
    return mockRequest('user.updateProfile', () => {
      const me = db.userById(db.ME_ID);
      Object.assign(me, update);
      return {...me};
    });
  },

  async contacts(): Promise<User[]> {
    return mockRequest('user.contacts', () =>
      db.users.filter(u => u.isContact && u.id !== db.ME_ID && !db.blockedUsers.includes(u.id)),
    );
  },

  async getUser(id: string): Promise<User> {
    return mockRequest('user.getUser', () => ({...db.userById(id), blocked: db.blockedUsers.includes(id)}));
  },

  async blockedUsers(): Promise<User[]> {
    return mockRequest('user.blockedUsers', () => db.blockedUsers.map(db.userById));
  },

  async setBlocked(id: string, blocked: boolean): Promise<void> {
    return mockRequest('user.setBlocked', () => {
      const i = db.blockedUsers.indexOf(id);
      if (blocked && i < 0) {
        db.blockedUsers.push(id);
      }
      if (!blocked && i >= 0) {
        db.blockedUsers.splice(i, 1);
      }
    });
  },

  async report(_targetId: string, _reason: string): Promise<void> {
    return mockRequest('user.report', () => undefined);
  },

  async deviceSessions(): Promise<DeviceSession[]> {
    return mockRequest('user.deviceSessions', () => [...db.deviceSessions]);
  },

  async revokeSession(id: string): Promise<void> {
    return mockRequest('user.revokeSession', () => {
      const i = db.deviceSessions.findIndex(s => s.id === id);
      if (i >= 0 && !db.deviceSessions[i].current) {
        db.deviceSessions.splice(i, 1);
      }
    });
  },
};

// ---------------------------------------------------------------------------
// Communities
// ---------------------------------------------------------------------------

export const communityService = {
  async discover(category?: string, query?: string): Promise<Community[]> {
    return mockRequest('community.discover', () => {
      let list = [...db.communities];
      if (category && category !== 'All') {
        list = list.filter(c => c.category === category);
      }
      if (query?.trim()) {
        const q = query.toLowerCase();
        list = list.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
      }
      return list;
    });
  },

  categories(): string[] {
    return db.communityCategories;
  },

  async myCommunities(): Promise<Community[]> {
    return mockRequest('community.myCommunities', () => db.communities.filter(c => c.joined));
  },

  async get(id: string): Promise<Community> {
    return mockRequest('community.get', () => {
      const c = db.communities.find(x => x.id === id);
      if (!c) {
        throw new ApiError('Community not found.', 'not_found');
      }
      return c;
    });
  },

  async join(id: string): Promise<Community> {
    return mockRequest('community.join', () => {
      const c = db.communities.find(x => x.id === id);
      if (!c) {
        throw new ApiError('Community not found.', 'not_found');
      }
      if (c.inviteOnly) {
        throw new ApiError('This community is invite-only.', 'unauthorized');
      }
      if (c.privacy === 'private') {
        c.joinRequested = true;
      } else {
        c.joined = true;
        c.role = 'member';
        c.memberCount += 1;
      }
      return c;
    });
  },

  async leave(id: string): Promise<void> {
    return mockRequest('community.leave', () => {
      const c = db.communities.find(x => x.id === id);
      if (c) {
        c.joined = false;
        c.role = undefined;
        c.memberCount -= 1;
      }
    });
  },

  async create(input: {name: string; category: string; description: string; privacy: 'public' | 'private'}): Promise<Community> {
    return mockRequest('community.create', () => {
      if (input.name.trim().length < 3) {
        throw new ApiError('Community name must be at least 3 characters.', 'validation');
      }
      const c: Community = {
        id: db.nextId('co'),
        name: input.name.trim(),
        category: input.category,
        description: input.description.trim(),
        memberCount: 1,
        privacy: input.privacy,
        joined: true,
        role: 'admin',
        rules: ['Be kind.'],
        announcements: [],
        events: [],
        polls: [],
        feed: [],
        inviteLink: `https://yay.chat/c/${input.name.trim().toLowerCase().replace(/\s+/g, '-')}`,
      };
      db.communities.unshift(c);
      return c;
    });
  },

  async update(id: string, input: Partial<Pick<Community, 'name' | 'description' | 'rules'>>): Promise<Community> {
    return mockRequest('community.update', () => {
      const c = db.communities.find(x => x.id === id);
      if (!c) {
        throw new ApiError('Community not found.', 'not_found');
      }
      Object.assign(c, input);
      return c;
    });
  },

  async vote(communityId: string, pollId: string, optionIndex: number): Promise<Community> {
    return mockRequest('community.vote', () => {
      const c = db.communities.find(x => x.id === communityId);
      const poll = c?.polls.find(p => p.id === pollId);
      if (!c || !poll) {
        throw new ApiError('Poll not found.', 'not_found');
      }
      if (poll.votedIndex === undefined) {
        poll.options[optionIndex].votes += 1;
        poll.votedIndex = optionIndex;
      }
      return c;
    });
  },

  async postToFeed(communityId: string, body: string): Promise<Community> {
    return mockRequest('community.postToFeed', () => {
      const c = db.communities.find(x => x.id === communityId);
      if (!c) {
        throw new ApiError('Community not found.', 'not_found');
      }
      if (!body.trim()) {
        throw new ApiError('Post cannot be empty.', 'validation');
      }
      c.feed.unshift({id: db.nextId('fp'), authorName: 'Jordan Reyes', body: body.trim(), postedAt: new Date().toISOString(), likes: 0});
      return c;
    });
  },

  async report(_communityId: string, _reason: string): Promise<void> {
    return mockRequest('community.report', () => undefined);
  },
};

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

const AI_RESPONSES: Record<string, string> = {
  translate: 'Here is the translation you asked for:\n\n“Bom dia!”\n\n(Simulated translation — production AI arrives in Milestone 5.)',
  summarize: 'Summary:\n\n• The text covers three main points.\n• The tone is positive overall.\n• Action items are listed at the end.\n\n(Simulated summary.)',
  email: 'Subject: Quick follow-up\n\nHi there,\n\nI wanted to follow up on our conversation...\n\nBest,\nJordan\n\n(Simulated draft — edit before sending.)',
  study: 'Let’s break this into a study plan:\n\n1. Review core concepts (25 min)\n2. Practice problems (25 min)\n3. Recap and flashcards (10 min)\n\n(Simulated response.)',
  code: 'Looking at your description, the likely issue is an off-by-one error in the loop bounds. Try iterating to `length - 1`.\n\n(Simulated response.)',
  finance: 'General information only, not financial advice: diversification means spreading holdings across assets to reduce risk.\n\n(Simulated response.)',
};

export const aiService = {
  tools: () => db.aiTools,
  suggestedPrompts: () => db.suggestedPrompts,

  async usage(): Promise<AiUsage> {
    return mockRequest('ai.usage', () => ({...db.aiUsage}));
  },

  async history(): Promise<AiConversation[]> {
    return mockRequest('ai.history', () =>
      [...db.aiConversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  },

  async get(id: string): Promise<AiConversation> {
    return mockRequest('ai.get', () => {
      const c = db.aiConversations.find(x => x.id === id);
      if (!c) {
        throw new ApiError('Conversation not found.', 'not_found');
      }
      return c;
    });
  },

  async start(tool: string, firstPrompt?: string): Promise<AiConversation> {
    return mockRequest('ai.start', () => {
      const convo: AiConversation = {
        id: db.nextId('ai'),
        title: firstPrompt ? firstPrompt.slice(0, 40) : `New ${tool} session`,
        tool,
        saved: false,
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      db.aiConversations.unshift(convo);
      return convo;
    }, {latencyMs: 200});
  },

  async send(conversationId: string, text: string, toolId?: string): Promise<AiConversation> {
    return mockRequest(
      'ai.send',
      () => {
        const c = db.aiConversations.find(x => x.id === conversationId);
        if (!c) {
          throw new ApiError('Conversation not found.', 'not_found');
        }
        if (db.aiUsage.usedCredits >= db.aiUsage.totalCredits) {
          throw new ApiError('You have used all preview credits for today.', 'rate_limited');
        }
        if (text.includes('#unavailable')) {
          throw new ApiError('aiainai is temporarily unavailable. Please try again shortly.', 'server');
        }
        c.messages.push({id: db.nextId('am'), role: 'user', text, createdAt: new Date().toISOString()});
        const canned =
          AI_RESPONSES[toolId ?? ''] ??
          `Here is a simulated answer to “${text.slice(0, 60)}”.\n\nIn the production build this will be a real AI response. For now it demonstrates layout, streaming states, and history.`;
        c.messages.push({id: db.nextId('am'), role: 'assistant', text: canned, createdAt: new Date().toISOString()});
        c.updatedAt = new Date().toISOString();
        if (c.messages.length === 2) {
          c.title = text.slice(0, 40);
        }
        db.aiUsage.usedCredits += 1;
        return c;
      },
      {latencyMs: 900},
    );
  },

  async setSaved(id: string, saved: boolean): Promise<void> {
    const c = db.aiConversations.find(x => x.id === id);
    if (c) {
      c.saved = saved;
    }
  },

  async remove(id: string): Promise<void> {
    const i = db.aiConversations.findIndex(x => x.id === id);
    if (i >= 0) {
      db.aiConversations.splice(i, 1);
    }
  },
};

// ---------------------------------------------------------------------------
// Earn
// ---------------------------------------------------------------------------

export const earnService = {
  async summary(): Promise<EarnSummary> {
    return mockRequest('earn.summary', () => ({...db.earnSummary, referrals: [...db.earnSummary.referrals], campaigns: [...db.earnSummary.campaigns]}));
  },

  async activities(): Promise<EarnActivity[]> {
    return mockRequest('earn.activities', () => db.earnActivities.map(a => ({...a})));
  },

  async checkIn(): Promise<EarnSummary> {
    return mockRequest('earn.checkIn', () => {
      if (db.earnSummary.checkedInToday) {
        throw new ApiError('You already checked in today. Come back tomorrow!', 'validation');
      }
      db.earnSummary.checkedInToday = true;
      db.earnSummary.streakDays += 1;
      db.earnSummary.balance += 20;
      db.earnSummary.earnedToday += 20;
      db.rewardHistory.unshift({id: db.nextId('r'), activity: 'Daily check-in', amount: 20, unit: 'YayPoints', status: 'completed', createdAt: new Date().toISOString()});
      const act = db.earnActivities.find(a => a.id === 'act_checkin');
      if (act) {
        act.status = 'completed_today';
      }
      return {...db.earnSummary};
    });
  },

  async history(): Promise<RewardEntry[]> {
    return mockRequest('earn.history', () => [...db.rewardHistory]);
  },

  async rewardDetail(id: string): Promise<RewardEntry> {
    return mockRequest('earn.rewardDetail', () => {
      const r = db.rewardHistory.find(x => x.id === id);
      if (!r) {
        throw new ApiError('Reward not found.', 'not_found');
      }
      return r;
    });
  },
};

// ---------------------------------------------------------------------------
// Wallet (preview only)
// ---------------------------------------------------------------------------

export const walletService = {
  async assets(): Promise<WalletAsset[]> {
    return mockRequest('wallet.assets', () => db.walletAssets.map(a => ({...a})));
  },

  async transactions(): Promise<WalletTransaction[]> {
    return mockRequest('wallet.transactions', () => [...db.walletTransactions]);
  },

  async transaction(id: string): Promise<WalletTransaction> {
    return mockRequest('wallet.transaction', () => {
      const t = db.walletTransactions.find(x => x.id === id);
      if (!t) {
        throw new ApiError('Transaction not found.', 'not_found');
      }
      return t;
    });
  },
};

// ---------------------------------------------------------------------------
// Ecosystem
// ---------------------------------------------------------------------------

export const ecosystemService = {
  async products(): Promise<EcosystemProduct[]> {
    return mockRequest('ecosystem.products', () => [...db.ecosystemProducts]);
  },

  async product(id: string): Promise<EcosystemProduct> {
    return mockRequest('ecosystem.product', () => {
      const p = db.ecosystemProducts.find(x => x.id === id);
      if (!p) {
        throw new ApiError('Product not found.', 'not_found');
      }
      return p;
    });
  },
};

// ---------------------------------------------------------------------------
// Social accounts
// ---------------------------------------------------------------------------

export const socialService = {
  async accounts(): Promise<SocialAccount[]> {
    return mockRequest('social.accounts', () => db.socialAccounts.map(a => ({...a})));
  },

  async account(id: string): Promise<SocialAccount> {
    return mockRequest('social.account', () => {
      const account = db.socialAccounts.find(a => a.id === id);
      if (!account) {
        throw new ApiError('Unknown social platform.', 'not_found');
      }
      return {...account};
    });
  },

  /** Connects a disconnected platform (mock OAuth) or disconnects a linked one. */
  async toggle(id: string): Promise<SocialAccount> {
    return mockRequest('social.toggle', () => {
      const account = db.socialAccounts.find(a => a.id === id);
      if (!account) {
        throw new ApiError('Unknown social platform.', 'not_found');
      }
      if (account.connected) {
        account.connected = false;
        account.handle = undefined;
      } else {
        account.connected = true;
        account.handle = `@${db.userById(db.ME_ID).name.replace(/\s+/g, '').toLowerCase()}`;
      }
      return {...account};
    });
  },
};

// ---------------------------------------------------------------------------
// BTCY dashboard
// ---------------------------------------------------------------------------

export const btcyService = {
  async dashboard(): Promise<BtcyDashboard> {
    return mockRequest('btcy.dashboard', () => ({...db.btcyDashboard}));
  },
};

export const emmmService = {
  async dashboard(): Promise<EmmmDashboard> {
    return mockRequest('emmm.dashboard', () => ({...db.emmmDashboard}));
  },
};

export const shoperpalService = {
  async dashboard(): Promise<ShoperpalDashboard> {
    return mockRequest('shoperpal.dashboard', () => ({...db.shoperpalDashboard}));
  },
};

export const rehumanService = {
  async dashboard(): Promise<RehumanDashboard> {
    return mockRequest('rehuman.dashboard', () => ({...db.rehumanDashboard}));
  },
};

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

export const paymentService = {
  async methods(): Promise<PaymentMethod[]> {
    return mockRequest('payments.methods', () => db.paymentMethods.map(m => ({...m})));
  },

  async method(id: string): Promise<PaymentMethod> {
    return mockRequest('payments.method', () => {
      const method = db.paymentMethods.find(m => m.id === id);
      if (!method) {
        throw new ApiError('Unknown payment method.', 'not_found');
      }
      return {...method};
    });
  },

  /** Links an unlinked rail (mock flow) or unlinks a linked one. */
  async toggle(id: string): Promise<PaymentMethod> {
    return mockRequest('payments.toggle', () => {
      const method = db.paymentMethods.find(m => m.id === id);
      if (!method) {
        throw new ApiError('Unknown payment method.', 'not_found');
      }
      if (method.linked) {
        method.linked = false;
        method.detail = undefined;
      } else {
        method.linked = true;
        method.detail = db.paymentMockDetail[method.id];
      }
      return {...method};
    });
  },
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    return mockRequest('notifications.list', () => [...db.notifications]);
  },

  async markAllRead(): Promise<void> {
    db.notifications.forEach(n => {
      n.read = true;
    });
  },
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settingsService = {
  async get(): Promise<SettingsState> {
    return mockRequest('settings.get', () => JSON.parse(JSON.stringify(db.settings)), {latencyMs: 150});
  },

  async update(next: SettingsState): Promise<SettingsState> {
    Object.assign(db.settings, next);
    return JSON.parse(JSON.stringify(db.settings));
  },
};
