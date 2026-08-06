/**
 * YaysApp mock service layer.
 *
 * This is the only module screens import for data. Signatures are designed to
 * survive the swap to real APIs in Milestones 2–3 (see
 * docs/yaychat-mock-api-contracts.md).
 */
import Config from 'react-native-config';
import API from '../../services/api';
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
const BACKEND_ENABLED = String(Config.YAYCHAT_USE_BACKEND || '').toLowerCase() === 'true';
const BACKEND_PAGE_SIZE = 30;

type StoredSession = Session & {refreshToken?: string};
type BackendUser = {
  _id?: string;
  id?: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  bio?: string;
  profilePic?: string;
  mutedChatIds?: string[];
};
type BackendMessage = {
  _id?: string;
  id?: string;
  messageId?: string;
  clientId?: string;
  email?: string;
  receiverEmail?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  message?: string;
  fileUrl?: string;
  fileType?: 'image' | 'document' | 'video' | 'pdf' | 'word' | 'file';
  timestamp?: string | Date;
  groupId?: string;
  isRead?: boolean;
  isDeleted?: boolean;
  isUpdated?: boolean;
  reactions?: {name?: string; users?: string[]; count?: number}[];
  replyTo?: {messageId?: string};
};
type BackendGroup = {
  _id?: string;
  id?: string;
  groupId?: string;
  name?: string;
  createdBy?: string;
  members?: string[];
  isGlobal?: boolean;
  isAdminOnly?: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | Date | null;
};

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const directConversationId = (email: string) => `dm:${normalizeEmail(email)}`;
const groupConversationId = (groupId: string) => `group:${groupId}`;
const isBackendDirectId = (id: string) => id.startsWith('dm:');
const isBackendGroupId = (id: string) => id.startsWith('group:');
const directPeerFromId = (id: string) => id.replace(/^dm:/, '');
const groupIdFromConversationId = (id: string) => id.replace(/^group:/, '');

const backendBody = (payload: any) => {
  if (payload && typeof payload === 'object' && 'data' in payload && 'status' in payload) {
    return payload.data;
  }
  return payload;
};

const backendList = (payload: any): any[] => {
  const body = backendBody(payload);
  if (Array.isArray(body)) {
    return body;
  }
  if (Array.isArray(body?.data)) {
    return body.data;
  }
  if (Array.isArray(body?.users)) {
    return body.users;
  }
  if (Array.isArray(body?.result)) {
    return body.result;
  }
  return [];
};

const backendErrorMessage = (e: any): string =>
  e?.response?.data?.message ||
  e?.response?.data?.data?.message ||
  e?.response?.data?.data ||
  e?.message ||
  'The Indexx service is unavailable right now.';

const toApiError = (e: any): ApiError => {
  if (!e?.response) {
    return new ApiError('No internet connection.', 'offline');
  }
  if (e.response.status === 401 || e.response.status === 403) {
    return new ApiError(backendErrorMessage(e), 'unauthorized');
  }
  if (e.response.status === 404) {
    return new ApiError(backendErrorMessage(e), 'not_found');
  }
  if (e.response.status === 400) {
    return new ApiError(backendErrorMessage(e), 'validation');
  }
  return new ApiError(backendErrorMessage(e), 'server');
};

const loadStoredSession = async (): Promise<StoredSession | null> => {
  const raw = await secureTokenStore.load();
  return raw ? (JSON.parse(raw) as StoredSession) : null;
};

const backendSessionEmail = async (): Promise<string> => {
  const session = await loadStoredSession();
  const email = normalizeEmail(session?.user?.email);
  if (!email) {
    throw new ApiError('Please sign in again.', 'unauthorized');
  }
  return email;
};

const backendAuthHeaders = async () => {
  const session = await loadStoredSession();
  return session?.token ? {Authorization: `Bearer ${session.token}`} : undefined;
};

const backendGet = async <T,>(path: string, params?: Record<string, unknown>): Promise<T> => {
  try {
    const res = await API.get(path, {params, headers: await backendAuthHeaders()});
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
};

const backendPost = async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
  try {
    const res = await API.post(path, body, {headers: await backendAuthHeaders()});
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
};

const backendPatch = async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
  try {
    const res = await API.patch(path, body, {headers: await backendAuthHeaders()});
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
};

const backendDelete = async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
  try {
    const res = await API.delete(path, {data: body, headers: await backendAuthHeaders()});
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
};

const backendUserToUser = (input: BackendUser, fallbackEmail?: string): User => {
  const email = normalizeEmail(input.email || fallbackEmail);
  const first = String(input.firstName || '').trim();
  const last = String(input.lastName || '').trim();
  const name = [first, last].filter(Boolean).join(' ') || input.username || email || 'Indexx user';
  return {
    id: email || String(input.id || input._id || ''),
    name,
    username: input.username || email.split('@')[0] || 'indexx_user',
    email,
    phone: input.phone,
    bio: input.bio || '',
    online: false,
    lastSeen: new Date().toISOString(),
    isContact: true,
  };
};

const backendSessionToUser = (payload: any, email: string): User =>
  backendUserToUser(
    {
      email: payload?.email || email,
      username: payload?.username,
      firstName: payload?.firstName,
      lastName: payload?.lastName,
    },
    email,
  );

const backendMessageKind = (m: BackendMessage): Message['kind'] => {
  if (!m.fileType) {
    return 'text';
  }
  if (m.fileType === 'document' || m.fileType === 'pdf' || m.fileType === 'word') {
    return 'file';
  }
  return m.fileType;
};

const backendAttachment = (m: BackendMessage): Message['attachment'] | undefined => {
  if (!m.fileUrl && !m.fileType) {
    return undefined;
  }
  const rawName = String(m.fileUrl || m.fileType || 'attachment');
  const name = rawName.split('/').pop() || rawName;
  return {name, sizeLabel: 'Uploaded'};
};

const backendMessageToMessage = (m: BackendMessage, meEmail: string): Message => {
  const senderEmail = normalizeEmail(m.email);
  const mine = senderEmail === meEmail;
  const peer = mine ? normalizeEmail(m.receiverEmail) : senderEmail;
  const conversationId = m.groupId ? groupConversationId(String(m.groupId)) : directConversationId(peer);
  return {
    id: String(m.messageId || m._id || m.id || m.clientId || Date.now()),
    clientId: m.clientId,
    conversationId,
    senderId: mine ? db.ME_ID : senderEmail,
    kind: backendMessageKind(m),
    text: m.message || '',
    createdAt: new Date(m.timestamp || Date.now()).toISOString(),
    status: mine ? 'sent' : m.isRead ? 'read' : 'delivered',
    replyToId: m.replyTo?.messageId,
    reactions: (m.reactions || []).map(r => ({
      emoji: r.name || '👍',
      userIds: (r.users || []).map(u => (normalizeEmail(u) === meEmail ? db.ME_ID : normalizeEmail(u))),
    })),
    deleted: !!m.isDeleted,
    recalled: !!m.isDeleted,
    edited: !!m.isUpdated,
    attachment: backendAttachment(m),
  };
};

const directPeerFromMessage = (m: BackendMessage, meEmail: string): string => {
  const sender = normalizeEmail(m.email);
  const receiver = normalizeEmail(m.receiverEmail);
  return sender === meEmail ? receiver : sender;
};

const backendDirectConversation = (
  peerEmail: string,
  meEmail: string,
  last?: BackendMessage,
  unreadCount = 0,
): Conversation => ({
  id: directConversationId(peerEmail),
  type: 'direct',
  title: peerEmail,
  memberIds: [db.ME_ID, normalizeEmail(peerEmail)],
  lastMessage: last ? backendMessageToMessage(last, meEmail) : undefined,
  unreadCount,
  muted: false,
  pinned: false,
  archived: false,
  typingUserIds: [],
});

const backendGroupConversation = (
  group: BackendGroup,
  meEmail: string,
  unreadCount = 0,
): Conversation => {
  const gid = String(group.groupId || group.id || group._id || '');
  const lastText = group.lastMessage || '';
  const lastAt = group.lastMessageAt ? new Date(group.lastMessageAt).toISOString() : undefined;
  return {
    id: groupConversationId(gid),
    type: 'group',
    title: group.name || 'Group',
    memberIds: [
      db.ME_ID,
      ...((group.members || [])
        .map(normalizeEmail)
        .filter(email => email && email !== meEmail)),
    ],
    lastMessage: lastText
      ? {
          id: `last_${gid}`,
          conversationId: groupConversationId(gid),
          senderId: '',
          kind: 'text',
          text: lastText,
          createdAt: lastAt || new Date().toISOString(),
          status: 'delivered',
          reactions: [],
        }
      : undefined,
    unreadCount,
    muted: false,
    pinned: false,
    archived: false,
    typingUserIds: [],
    groupRoles: group.createdBy ? {[normalizeEmail(group.createdBy)]: 'owner'} : undefined,
  };
};

const backendUnreadSummary = async (meEmail: string) => {
  try {
    return await backendGet<any>('/api/v1/chat/counts/unread', {email: meEmail});
  } catch {
    return {total: 0, direct: {perPeer: []}, groups: {perGroup: []}};
  }
};

const unreadForPeer = (summary: any, peerEmail: string): number => {
  const peer = normalizeEmail(peerEmail);
  return Number(
    summary?.direct?.perPeer?.find((x: any) => normalizeEmail(x.peerEmail) === peer)?.count || 0,
  );
};

const unreadForGroup = (summary: any, groupId: string): number =>
  Number(summary?.groups?.perGroup?.find((x: any) => String(x.groupId) === groupId)?.count || 0);

let backendPollVersions: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const authService = {
  async signIn(email: string, password: string): Promise<Session> {
    if (BACKEND_ENABLED) {
      if (!EMAIL_RE.test(email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
      if (password.length < 6) {
        throw new ApiError('Password must be at least 6 characters.', 'validation');
      }
      try {
        const res = await API.post('/api/v1/inex/user/login', {
          email: email.trim().toLowerCase(),
          password,
        });
        const payload = backendBody(res.data);
        if (!payload?.access_token) {
          throw new ApiError(payload?.message || 'Could not sign in.', 'unauthorized');
        }
        const session: StoredSession = {
          token: payload.access_token,
          refreshToken: payload.refresh_token,
          user: backendSessionToUser(payload, email),
          onboarded: true,
        };
        await secureTokenStore.save(JSON.stringify(session));
        return session;
      } catch (e) {
        if (e instanceof ApiError) {
          throw e;
        }
        throw toApiError(e);
      }
    }
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
    if (BACKEND_ENABLED) {
      if (input.name.trim().length < 2) {
        throw new ApiError('Enter your name.', 'validation');
      }
      if (!EMAIL_RE.test(input.email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
      if (input.password.length < 8) {
        throw new ApiError('Password must be at least 8 characters.', 'validation');
      }
      try {
        const username = input.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
        await API.post('/api/v1/inex/user/registerwithapp', {
          email: input.email.trim().toLowerCase(),
          password: input.password,
          username: username || input.name.trim().replace(/\s+/g, '_').toLowerCase(),
          registerFrom: 'YaysApp',
        });
        return this.signIn(input.email, input.password);
      } catch (e) {
        throw toApiError(e);
      }
    }
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
    if (BACKEND_ENABLED) {
      return loadStoredSession();
    }
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

export type ChatEvent =
  | {type: 'message.upsert'; conversationId: string; message: Message}
  | {type: 'message.deleted'; conversationId: string; messageId: string; message?: Message}
  | {type: 'conversation.updated'; conversation: Conversation}
  | {type: 'conversation.deleted'; conversationId: string}
  | {type: 'typing.changed'; conversationId: string; userIds: string[]};

const chatListeners = new Set<(event: ChatEvent) => void>();

const emitChatEvent = (event: ChatEvent) => {
  chatListeners.forEach(listener => listener(event));
};

const emitConversation = (conversationId: string) => {
  const c = db.conversations.find(x => x.id === conversationId);
  if (c) {
    emitChatEvent({type: 'conversation.updated', conversation: withLastMessage(c)});
  }
};

const pageMessages = (all: Message[], cursor?: string): Page<Message> => {
  const pageSize = 30;
  const cursorIndex = cursor ? all.findIndex(m => m.id === cursor) : -1;
  const safeEnd = cursor ? (cursorIndex >= 0 ? cursorIndex : all.length) : all.length;
  const start = Math.max(0, safeEnd - pageSize);
  const items = all.slice(start, safeEnd);
  return {
    items,
    nextCursor: start > 0 ? items[0]?.id ?? null : null,
  };
};

const backendChat = {
  async listConversations(filter: 'all' | 'unread' | 'groups' | 'archived' = 'all'): Promise<Conversation[]> {
    if (filter === 'archived') {
      return [];
    }
    const meEmail = await backendSessionEmail();
    const [latestPayload, groupsPayload, summary] = await Promise.all([
      backendGet<any>(`/api/v1/chat/lastmessages/${encodeURIComponent(meEmail)}`, {limit: 20}).catch(() => []),
      backendGet<any>('/api/v1/chat/groups', {email: meEmail}).catch(() => []),
      backendUnreadSummary(meEmail),
    ]);

    const directConversations = backendList(latestPayload)
      .map((m: BackendMessage) => {
        const peer = directPeerFromMessage(m, meEmail);
        return peer ? backendDirectConversation(peer, meEmail, m, unreadForPeer(summary, peer)) : null;
      })
      .filter(Boolean) as Conversation[];

    const groupConversations = backendList(groupsPayload).map((g: BackendGroup) => {
      const gid = String(g.groupId || g.id || g._id || '');
      return backendGroupConversation(g, meEmail, unreadForGroup(summary, gid));
    });

    const list = filter === 'groups' ? groupConversations : [...directConversations, ...groupConversations];
    return sortConversations(filter === 'unread' ? list.filter(c => c.unreadCount > 0) : list);
  },

  async getConversation(id: string): Promise<Conversation> {
    const meEmail = await backendSessionEmail();
    const summary = await backendUnreadSummary(meEmail);
    if (isBackendDirectId(id)) {
      const peer = directPeerFromId(id);
      return backendDirectConversation(peer, meEmail, undefined, unreadForPeer(summary, peer));
    }
    if (isBackendGroupId(id)) {
      const gid = groupIdFromConversationId(id);
      const groups = backendList(await backendGet<any>('/api/v1/chat/groups', {email: meEmail}));
      const group = groups.find((g: BackendGroup) => String(g.groupId || g.id || g._id) === gid);
      if (!group) {
        throw new ApiError('Conversation not found.', 'not_found');
      }
      return backendGroupConversation(group, meEmail, unreadForGroup(summary, gid));
    }
    throw new ApiError('Conversation not found.', 'not_found');
  },

  async getMessages(conversationId: string, cursor?: string): Promise<Page<Message>> {
    const meEmail = await backendSessionEmail();
    const params: Record<string, unknown> = {email: meEmail, limit: BACKEND_PAGE_SIZE};
    if (cursor) {
      params.beforeId = cursor;
    }

    const payload = isBackendGroupId(conversationId)
      ? await backendGet<any>(
          `/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}/messages/paged`,
          params,
        )
      : await backendGet<any>(
          `/api/v1/chat/messages/${encodeURIComponent(meEmail)}/paged`,
          {...params, with: directPeerFromId(conversationId)},
        );
    const rawMessages = (payload?.messages || []) as BackendMessage[];
    const items = rawMessages.map(m => backendMessageToMessage(m, meEmail)).reverse();
    return {
      items,
      nextCursor: payload?.hasMoreOlder ? payload?.nextBeforeId || items[0]?.id || null : null,
    };
  },

  async sendMessage(
    conversationId: string,
    input: {
      text: string;
      kind?: Message['kind'];
      replyToId?: string;
      attachment?: Message['attachment'];
      clientId?: string;
    },
  ): Promise<Message> {
    const meEmail = await backendSessionEmail();
    const fileType = input.attachment
      ? input.kind === 'image' || input.kind === 'video'
        ? input.kind
        : 'file'
      : undefined;
    const body = {
      email: meEmail,
      message: input.text,
      fileType,
      fileUrl: input.attachment?.name,
      replyToMessageId: input.replyToId,
      clientId: input.clientId,
    };
    const saved = isBackendGroupId(conversationId)
      ? await backendPost<BackendMessage>('/api/v1/chat/sendGroupmessage', {
          ...body,
          groupId: groupIdFromConversationId(conversationId),
        })
      : await backendPost<BackendMessage>('/api/v1/chat/messages', {
          ...body,
          to: directPeerFromId(conversationId),
        });
    const message = backendMessageToMessage(saved, meEmail);
    emitChatEvent({type: 'message.upsert', conversationId, message});
    emitChatEvent({type: 'conversation.updated', conversation: await this.getConversation(conversationId)});
    return message;
  },

  async markRead(conversationId: string): Promise<void> {
    const meEmail = await backendSessionEmail();
    if (isBackendGroupId(conversationId)) {
      await backendPost(`/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}/read`, {
        email: meEmail,
      });
      return;
    }
    const page = await this.getMessages(conversationId);
    const unreadIds = page.items.filter(m => m.senderId !== db.ME_ID && m.status !== 'read').map(m => m.id);
    if (unreadIds.length) {
      await backendPost('/api/v1/chat/messages/read', {email: meEmail, messageIds: unreadIds});
    }
  },

  async getUnreadTotal(): Promise<number> {
    const meEmail = await backendSessionEmail();
    const summary = await backendUnreadSummary(meEmail);
    return Number(summary?.total || 0);
  },

  async toggleReaction(conversationId: string, messageId: string, emoji: string): Promise<Message> {
    const meEmail = await backendSessionEmail();
    const page = await this.getMessages(conversationId);
    const existing = page.items.find(m => m.id === messageId);
    const reacted = existing?.reactions.some(
      r => r.emoji === emoji && r.userIds.some(u => u === db.ME_ID || normalizeEmail(u) === meEmail),
    );
    const payload = reacted
      ? await backendPost<any>('/api/v1/chat/messages/reactions/remove', {messageId, name: emoji})
      : await backendPost<any>('/api/v1/chat/messages/reactions/add', {messageId, name: emoji});
    const updated = backendBody(payload)?.data || backendBody(payload) || existing;
    return backendMessageToMessage(updated, meEmail);
  },

  async deleteMessage(_conversationId: string, messageId: string): Promise<void> {
    await backendDelete('/api/v1/chat/messages/delete', {messageId});
  },

  async editMessage(_conversationId: string, messageId: string, text: string): Promise<Message> {
    const meEmail = await backendSessionEmail();
    const payload = await backendPatch<any>('/api/v1/chat/messages/update', {messageId, newMessage: text});
    const updated = backendBody(payload)?.data || backendBody(payload);
    return updated?._id || updated?.messageId
      ? backendMessageToMessage(updated, meEmail)
      : {
          id: messageId,
          conversationId: _conversationId,
          senderId: db.ME_ID,
          kind: 'text',
          text,
          createdAt: new Date().toISOString(),
          status: 'sent',
          reactions: [],
          edited: true,
        };
  },

  async createConversation(memberIds: string[], title?: string): Promise<Conversation> {
    const meEmail = await backendSessionEmail();
    const members = memberIds.map(normalizeEmail).filter(Boolean);
    if (members.length === 1) {
      return backendDirectConversation(members[0], meEmail);
    }
    const group = await backendPost<BackendGroup>('/api/v1/chat/groups/custom', {
      creatorEmail: meEmail,
      groupName: title?.trim() || 'New group',
      memberEmails: members,
    });
    return backendGroupConversation(group, meEmail);
  },

  async setMuted(conversationId: string, muted: boolean): Promise<void> {
    const meEmail = await backendSessionEmail();
    await backendPost('/api/v1/chat/mute', {email: meEmail, chatId: conversationId, newState: muted});
  },

  async setArchived(_conversationId: string, _archived: boolean): Promise<void> {
    return undefined;
  },

  async setPinned(_conversationId: string, _pinned: boolean): Promise<void> {
    return undefined;
  },

  async pinMessage(_conversationId: string, _messageId: string): Promise<void> {
    return undefined;
  },

  async forwardMessage(messageId: string, fromConversationId: string, toConversationIds: string[]): Promise<void> {
    const page = await this.getMessages(fromConversationId);
    const original = page.items.find(m => m.id === messageId);
    if (!original) {
      throw new ApiError('Message not found.', 'not_found');
    }
    await Promise.all(
      toConversationIds.map(cid =>
        this.sendMessage(cid, {
          text: original.text,
          kind: original.kind,
          attachment: original.attachment,
        }),
      ),
    );
  },

  async renameGroup(conversationId: string, title: string): Promise<void> {
    await backendPatch(`/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}`, {
      name: title,
    });
  },

  async removeGroupMember(conversationId: string, userId: string): Promise<void> {
    await backendDelete(`/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}/members`, {
      memberEmails: [normalizeEmail(userId)],
    });
  },

  async leaveGroup(conversationId: string): Promise<void> {
    const meEmail = await backendSessionEmail();
    await backendPost(`/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}/leave`, {
      email: meEmail,
    });
  },

  async searchMessages(query: string): Promise<{conversation: Conversation; message: Message}[]> {
    if (!query.trim()) {
      return [];
    }
    const conversations = await this.listConversations('all');
    const pages = await Promise.all(
      conversations.map(async conversation => ({
        conversation,
        page: await this.getMessages(conversation.id).catch(() => ({items: [] as Message[], nextCursor: null})),
      })),
    );
    const needle = query.toLowerCase();
    return pages.flatMap(({conversation, page}) =>
      page.items
        .filter(message => message.text.toLowerCase().includes(needle))
        .map(message => ({conversation, message})),
    );
  },

  subscribeConversation(conversationId: string, listener: (event: ChatEvent) => void): () => void {
    let stopped = false;
    const poll = async () => {
      if (stopped) {
        return;
      }
      try {
        const page = await this.getMessages(conversationId);
        const version = page.items.map(m => `${m.id}:${m.edited}:${m.deleted}:${m.text}`).join('|');
        if (backendPollVersions[conversationId] && backendPollVersions[conversationId] !== version) {
          page.items.forEach(message => listener({type: 'message.upsert', conversationId, message}));
        }
        backendPollVersions[conversationId] = version;
      } catch {
        // Polling is best-effort; foreground refresh still works.
      }
    };
    const id = setInterval(poll, 3000);
    poll();
    return () => {
      stopped = true;
      clearInterval(id);
    };
  },
};

export const chatService = {
  subscribe(listener: (event: ChatEvent) => void): () => void {
    if (BACKEND_ENABLED) {
      chatListeners.add(listener);
      let stopped = false;
      let lastVersion = '';
      const poll = async () => {
        if (stopped) {
          return;
        }
        try {
          const list = await backendChat.listConversations('all');
          const version = list
            .map(c => `${c.id}:${c.lastMessage?.id}:${c.lastMessage?.text}:${c.unreadCount}`)
            .join('|');
          if (lastVersion && lastVersion !== version) {
            list.forEach(conversation =>
              listener({type: 'conversation.updated', conversation}),
            );
          }
          lastVersion = version;
        } catch {
          // Chat-list polling is best-effort; screen focus still refreshes.
        }
      };
      const id = setInterval(poll, 5000);
      poll();
      return () => {
        stopped = true;
        clearInterval(id);
        chatListeners.delete(listener);
      };
    }
    chatListeners.add(listener);
    return () => {
      chatListeners.delete(listener);
    };
  },

  subscribeConversation(
    conversationId: string,
    listener: (event: ChatEvent) => void,
  ): () => void {
    if (BACKEND_ENABLED) {
      return backendChat.subscribeConversation(conversationId, listener);
    }
    const wrapped = (event: ChatEvent) => {
      if (
        ('conversationId' in event && event.conversationId === conversationId) ||
        (event.type === 'conversation.updated' && event.conversation.id === conversationId)
      ) {
        listener(event);
      }
    };
    chatListeners.add(wrapped);
    return () => {
      chatListeners.delete(wrapped);
    };
  },

  async listConversations(filter: 'all' | 'unread' | 'groups' | 'archived' = 'all'): Promise<Conversation[]> {
    if (BACKEND_ENABLED) {
      return backendChat.listConversations(filter);
    }
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
    if (BACKEND_ENABLED) {
      return backendChat.getConversation(id);
    }
    return mockRequest('chat.getConversation', () => {
      const c = db.conversations.find(x => x.id === id);
      if (!c) {
        throw new ApiError('Conversation not found.', 'not_found');
      }
      return withLastMessage(c);
    });
  },

  async getMessages(conversationId: string, cursor?: string): Promise<Page<Message>> {
    if (BACKEND_ENABLED) {
      return backendChat.getMessages(conversationId, cursor);
    }
    return mockRequest('chat.getMessages', () => {
      const all = db.messages[conversationId] ?? [];
      return pageMessages(all, cursor);
    });
  },

  async sendMessage(
    conversationId: string,
    input: {
      text: string;
      kind?: Message['kind'];
      replyToId?: string;
      attachment?: Message['attachment'];
      clientId?: string;
    },
  ): Promise<Message> {
    if (BACKEND_ENABLED) {
      return backendChat.sendMessage(conversationId, input);
    }
    return mockRequest(
      'chat.sendMessage',
      () => {
        if (input.text.trim().length === 0 && !input.attachment) {
          throw new ApiError('Message cannot be empty.', 'validation');
        }
        if (input.text.includes('#fail')) {
          throw new ApiError('Message failed to send.', 'server');
        }
        const list = db.messages[conversationId] ?? [];
        const existing = input.clientId
          ? list.find(m => m.clientId === input.clientId && m.senderId === db.ME_ID)
          : undefined;
        if (existing) {
          return {...existing};
        }
        const message: Message = {
          id: db.nextId('m'),
          clientId: input.clientId,
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
        db.messages[conversationId] = [...list, message];
        emitChatEvent({type: 'message.upsert', conversationId, message: {...message}});
        emitConversation(conversationId);
        return message;
      },
      {latencyMs: 350},
    );
  },

  async markRead(conversationId: string): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.markRead(conversationId);
    }
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.unreadCount = 0;
      emitConversation(conversationId);
    }
  },

  // Total unread across all active (non-archived) conversations — powers the
  // Chats tab badge and the home-screen Chats shortcut. Never throws so the
  // badge poller keeps working while offline.
  async getUnreadTotal(): Promise<number> {
    if (BACKEND_ENABLED) {
      return backendChat.getUnreadTotal();
    }
    return db.conversations
      .filter(c => !c.archived)
      .reduce((sum, c) => sum + (c.unreadCount > 0 ? c.unreadCount : 0), 0);
  },

  async toggleReaction(conversationId: string, messageId: string, emoji: string): Promise<Message> {
    if (BACKEND_ENABLED) {
      return backendChat.toggleReaction(conversationId, messageId, emoji);
    }
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
      emitChatEvent({type: 'message.upsert', conversationId, message: {...m}});
      return {...m};
    }, {latencyMs: 120});
  },

  async deleteMessage(conversationId: string, messageId: string, recall: boolean): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.deleteMessage(conversationId, messageId);
    }
    return mockRequest('chat.deleteMessage', () => {
      const m = (db.messages[conversationId] ?? []).find(x => x.id === messageId);
      if (m) {
        if (recall) {
          m.recalled = true;
          m.text = '';
        } else {
          m.deleted = true;
        }
        emitChatEvent({
          type: 'message.deleted',
          conversationId,
          messageId,
          message: {...m},
        });
        emitConversation(conversationId);
      }
    });
  },

  /** Edits the text of the caller's own message. */
  async editMessage(conversationId: string, messageId: string, text: string): Promise<Message> {
    if (BACKEND_ENABLED) {
      return backendChat.editMessage(conversationId, messageId, text);
    }
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
      emitChatEvent({type: 'message.upsert', conversationId, message: {...m}});
      emitConversation(conversationId);
      return {...m};
    });
  },

  /** Deletes a whole conversation and its message history (for this user). */
  async deleteConversation(conversationId: string): Promise<void> {
    if (BACKEND_ENABLED) {
      return undefined;
    }
    return mockRequest('chat.deleteConversation', () => {
      const idx = db.conversations.findIndex(c => c.id === conversationId);
      if (idx === -1) {
        throw new ApiError('Chat not found.', 'not_found');
      }
      db.conversations.splice(idx, 1);
      delete db.messages[conversationId];
      emitChatEvent({type: 'conversation.deleted', conversationId});
    });
  },

  async pinMessage(conversationId: string, messageId: string): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.pinMessage(conversationId, messageId);
    }
    return mockRequest('chat.pinMessage', () => {
      // One pinned message per conversation: pinning a message unpins others.
      (db.messages[conversationId] ?? []).forEach(m => {
        m.pinned = m.id === messageId ? !m.pinned : false;
        emitChatEvent({type: 'message.upsert', conversationId, message: {...m}});
      });
    });
  },

  async forwardMessage(messageId: string, fromConversationId: string, toConversationIds: string[]): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.forwardMessage(messageId, fromConversationId, toConversationIds);
    }
    return mockRequest('chat.forwardMessage', () => {
      const m = (db.messages[fromConversationId] ?? []).find(x => x.id === messageId);
      if (!m) {
        throw new ApiError('Message not found.', 'not_found');
      }
      toConversationIds.forEach(cid => {
        const forwarded = {
          ...m,
          id: db.nextId('m'),
          clientId: undefined,
          conversationId: cid,
          senderId: db.ME_ID,
          createdAt: new Date().toISOString(),
          status: 'sent' as const,
          reactions: [],
          pinned: false,
        };
        db.messages[cid] = [...(db.messages[cid] ?? []), forwarded];
        emitChatEvent({type: 'message.upsert', conversationId: cid, message: forwarded});
        emitConversation(cid);
      });
    });
  },

  async setMuted(conversationId: string, muted: boolean): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.setMuted(conversationId, muted);
    }
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.muted = muted;
      emitConversation(conversationId);
    }
  },

  async setArchived(conversationId: string, archived: boolean): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.setArchived(conversationId, archived);
    }
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.archived = archived;
      emitConversation(conversationId);
    }
  },

  async setPinned(conversationId: string, pinned: boolean): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.setPinned(conversationId, pinned);
    }
    const c = db.conversations.find(x => x.id === conversationId);
    if (c) {
      c.pinned = pinned;
      emitConversation(conversationId);
    }
  },

  async createConversation(memberIds: string[], title?: string, category?: string): Promise<Conversation> {
    if (BACKEND_ENABLED) {
      return backendChat.createConversation(memberIds, title);
    }
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
      emitChatEvent({type: 'conversation.updated', conversation: withLastMessage(convo)});
      return convo;
    });
  },

  async renameGroup(conversationId: string, title: string): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.renameGroup(conversationId, title);
    }
    return mockRequest('chat.renameGroup', () => {
      const c = db.conversations.find(x => x.id === conversationId);
      if (!c) {
        throw new ApiError('Chat not found.', 'not_found');
      }
      if (!title.trim()) {
        throw new ApiError('Group name cannot be empty.', 'validation');
      }
      c.title = title.trim();
      emitConversation(conversationId);
    });
  },

  async setGroupRole(conversationId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
    if (BACKEND_ENABLED) {
      return undefined;
    }
    return mockRequest('chat.setGroupRole', () => {
      const c = db.conversations.find(x => x.id === conversationId);
      if (!c || !c.groupRoles) {
        throw new ApiError('Group not found.', 'not_found');
      }
      if (c.groupRoles[userId] === 'owner') {
        throw new ApiError("The owner's role cannot be changed.", 'validation');
      }
      c.groupRoles[userId] = role;
      emitConversation(conversationId);
    });
  },

  async removeGroupMember(conversationId: string, userId: string): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.removeGroupMember(conversationId, userId);
    }
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
      emitConversation(conversationId);
    });
  },

  async leaveGroup(conversationId: string): Promise<void> {
    if (BACKEND_ENABLED) {
      return backendChat.leaveGroup(conversationId);
    }
    return mockRequest('chat.leaveGroup', () => {
      const i = db.conversations.findIndex(x => x.id === conversationId);
      if (i >= 0) {
        db.conversations.splice(i, 1);
        emitChatEvent({type: 'conversation.deleted', conversationId});
      }
    });
  },

  async setTyping(conversationId: string, userId: string, typing: boolean): Promise<void> {
    if (BACKEND_ENABLED) {
      return undefined;
    }
    const c = db.conversations.find(x => x.id === conversationId);
    if (!c) {
      return;
    }
    c.typingUserIds = typing
      ? [...new Set([...c.typingUserIds, userId])]
      : c.typingUserIds.filter(id => id !== userId);
    emitChatEvent({type: 'typing.changed', conversationId, userIds: [...c.typingUserIds]});
  },

  async simulateIncomingMessage(
    conversationId: string,
    input: {
      senderId: string;
      text: string;
      kind?: Message['kind'];
      attachment?: Message['attachment'];
    },
  ): Promise<Message> {
    if (BACKEND_ENABLED) {
      throw new ApiError('Simulated replies are disabled in backend mode.', 'validation');
    }
    return mockRequest(
      'chat.simulateIncomingMessage',
      () => {
        const c = db.conversations.find(x => x.id === conversationId);
        if (!c) {
          throw new ApiError('Conversation not found.', 'not_found');
        }
        const message: Message = {
          id: db.nextId('m'),
          conversationId,
          senderId: input.senderId,
          kind: input.kind ?? 'text',
          text: input.text,
          createdAt: new Date().toISOString(),
          status: 'delivered',
          reactions: [],
          attachment: input.attachment,
        };
        db.messages[conversationId] = [...(db.messages[conversationId] ?? []), message];
        c.unreadCount += 1;
        emitChatEvent({type: 'message.upsert', conversationId, message: {...message}});
        emitConversation(conversationId);
        return message;
      },
      {latencyMs: 150},
    );
  },

  async searchMessages(query: string): Promise<{conversation: Conversation; message: Message}[]> {
    if (BACKEND_ENABLED) {
      return backendChat.searchMessages(query);
    }
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
    if (BACKEND_ENABLED) {
      const session = await loadStoredSession();
      if (!session?.user) {
        throw new ApiError('Please sign in again.', 'unauthorized');
      }
      return session.user;
    }
    return mockRequest('user.me', () => ({...db.userById(db.ME_ID)}));
  },

  async updateProfile(update: Partial<Pick<User, 'name' | 'bio' | 'username'>>): Promise<User> {
    if (BACKEND_ENABLED) {
      const session = await loadStoredSession();
      if (!session) {
        throw new ApiError('Please sign in again.', 'unauthorized');
      }
      const user = {...session.user, ...update};
      await secureTokenStore.save(JSON.stringify({...session, user}));
      return user;
    }
    return mockRequest('user.updateProfile', () => {
      const me = db.userById(db.ME_ID);
      Object.assign(me, update);
      return {...me};
    });
  },

  async contacts(): Promise<User[]> {
    if (BACKEND_ENABLED) {
      const meEmail = await backendSessionEmail();
      try {
        const payload = await backendGet<any>('/api/v1/chat/users/search', {email: meEmail});
        return backendList(payload)
          .map((u: BackendUser) => backendUserToUser(u))
          .filter(u => u.email && u.email !== meEmail);
      } catch (searchError) {
        try {
          const payload = await backendGet<any>('/api/v1/inex/user/getAllUsersLite');
          return backendList(payload)
            .map((u: BackendUser) => backendUserToUser(u))
            .filter(u => u.email && u.email !== meEmail);
        } catch (legacyError) {
          const legacy = legacyError as ApiError;
          if (legacy.code === 'unauthorized' || legacy.code === 'server' || legacy.code === 'offline') {
            return [];
          }
          throw searchError;
        }
      }
    }
    return mockRequest('user.contacts', () =>
      db.users.filter(u => u.isContact && u.id !== db.ME_ID && !db.blockedUsers.includes(u.id)),
    );
  },

  async getUser(id: string): Promise<User> {
    if (BACKEND_ENABLED) {
      if (id === db.ME_ID) {
        return this.me();
      }
      const email = normalizeEmail(id);
      try {
        const payload = await backendGet<any>(`/api/v1/inex/user/getUserByEmail/${encodeURIComponent(email)}`);
        return backendUserToUser(backendBody(payload), email);
      } catch {
        return backendUserToUser({email}, email);
      }
    }
    return mockRequest('user.getUser', () => ({...db.userById(id), blocked: db.blockedUsers.includes(id)}));
  },

  async blockedUsers(): Promise<User[]> {
    if (BACKEND_ENABLED) {
      return [];
    }
    return mockRequest('user.blockedUsers', () => db.blockedUsers.map(db.userById));
  },

  async setBlocked(id: string, blocked: boolean): Promise<void> {
    if (BACKEND_ENABLED) {
      const meEmail = await backendSessionEmail();
      await backendPost(blocked ? '/api/v1/chat/users/block-direct' : '/api/v1/chat/users/unblock-direct', {
        email: meEmail,
        blockedEmail: normalizeEmail(id),
      });
      return;
    }
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
    if (BACKEND_ENABLED) {
      const meEmail = await backendSessionEmail();
      await backendPost('/api/v1/chat/users/report', {
        email: meEmail,
        reportedEmail: normalizeEmail(_targetId),
        reason: _reason,
      });
      return;
    }
    return mockRequest('user.report', () => undefined);
  },

  async deviceSessions(): Promise<DeviceSession[]> {
    if (BACKEND_ENABLED) {
      return [];
    }
    return mockRequest('user.deviceSessions', () => [...db.deviceSessions]);
  },

  async revokeSession(id: string): Promise<void> {
    if (BACKEND_ENABLED) {
      return undefined;
    }
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
