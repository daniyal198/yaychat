/**
 * YaysApp mock service layer.
 *
 * This is the only module screens import for data. Signatures are designed to
 * survive the swap to real APIs in Milestones 2–3 (see
 * docs/yaychat-mock-api-contracts.md).
 */
import Config from 'react-native-config';
import {io, Socket} from 'socket.io-client';
import API, {baseAPIURL} from '../../services/api';
import {ApiError, delay, mockRequest, secureTokenStore} from './client';
import {dataMode} from './dataMode';
import {parsePhone, toE164 as toE164Phone} from '../utils/phone';
import {localEngine} from './ai/localEngine';
import {localCommunities} from './communities/localEngine';
import * as db from './mock/db';
import {
  AiAssistResult,
  AiConsent,
  AiConversation,
  AiMessage,
  AiProviderStatus,
  AiTool,
  AiUsage,
  SupportTicket,
  SupportTicketMessage,
  AppNotification,
  BtcyDashboard,
  EmmmDashboard,
  RehumanDashboard,
  ShoperpalDashboard,
  AnnouncementStats,
  Community,
  CommunityInvite,
  CommunityMember,
  ImpersonationFlag,
  Conversation,
  DeviceSession,
  EarnActivity,
  EarnSummary,
  EcosystemProduct,
  Message,
  NotificationPreferences,
  Page,
  PaymentMethod,
  PushDeviceInfo,
  RewardEntry,
  RewardStatus,
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
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const BACKEND_ENABLED = String(Config.YAYCHAT_USE_BACKEND || '').toLowerCase() === 'true';

/**
 * Whether auth talks to the real backend.
 *
 * Screens read this to decide whether to show preview-build hints such as "the
 * code is always 123456" — telling a user that while a real SMS is on its way
 * would send them looking for a code that will never work.
 */
export const usesLiveAuth = (): boolean => BACKEND_ENABLED;
const BACKEND_PAGE_SIZE = 30;
const CHAT_OPTIONAL_TIMEOUT_MS = 5000;
const CHAT_SOCKET_PATH = '/socket.io/';

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
/**
 * Canonical E.164 for anything sent to the backend.
 *
 * Was `.trim()`, which meant `0300 1234567` and `+923001234567` were two
 * different accounts to every phone lookup — the single most common way a
 * phone-based sign-in silently fails.
 */
const normalizePhone = (value: unknown) => toE164Phone(value);
const signupUsername = (identifier: string): string => {
  const normalized = String(identifier || '').trim().toLowerCase();
  const localPart = normalized.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 13) || 'yaysuser';
  let hash = 5381;
  for (const character of normalized) {
    hash = (hash * 33 + character.charCodeAt(0)) % 2147483647;
  }
  return `${localPart}_${hash.toString(36).slice(0, 6)}`.slice(0, 20);
};
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

const profilePictureMimeType = (uri: string): string => {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'png') {
    return 'image/png';
  }
  if (extension === 'heic' || extension === 'heif') {
    return `image/${extension}`;
  }
  if (extension === 'webp') {
    return 'image/webp';
  }
  return 'image/jpeg';
};

const isLocalProfilePicture = (uri: string): boolean =>
  /^(content|file):\/\//i.test(uri);

const uploadProfilePicture = async (uri: string): Promise<{key: string; publicUrl: string}> => {
  const contentType = profilePictureMimeType(uri);
  const presignedResponse = await API.get('/api/v1/inex/basic/getS3PresignedUrlForMobile', {
    params: {fileType: contentType},
  });
  const presigned = backendBody(presignedResponse.data);
  if (!presigned?.url || !presigned?.key) {
    throw new ApiError('Could not prepare the profile-picture upload.', 'server');
  }
  const localResponse = await fetch(uri);
  const blob = await localResponse.blob();
  const uploadResponse = await fetch(presigned.url, {
    method: 'PUT',
    headers: {'Content-Type': contentType},
    body: blob,
  });
  if (!uploadResponse.ok) {
    throw new ApiError('Could not upload the profile picture. Please try again.', 'server');
  }
  return {key: presigned.key, publicUrl: String(presigned.url).split('?')[0]};
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
  if (Array.isArray(body?.data?.data)) {
    return body.data.data;
  }
  if (Array.isArray(body?.data?.users)) {
    return body.data.users;
  }
  if (Array.isArray(body?.data?.result)) {
    return body.data.result;
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
  // The AI endpoints tag responses with a `code` so the client can render the
  // consent sheet or the quota banner instead of a generic error.
  if (e.response.data?.code === 'consent_required') {
    return new ApiError(backendErrorMessage(e), 'consent_required');
  }
  if (e.response.status === 429) {
    return new ApiError(backendErrorMessage(e), 'rate_limited');
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

let backendSessionRefresh: Promise<StoredSession | null> | null = null;

const refreshBackendSession = async (): Promise<StoredSession | null> => {
  if (backendSessionRefresh) {
    return backendSessionRefresh;
  }
  backendSessionRefresh = (async () => {
    const session = await loadStoredSession();
    if (!session?.refreshToken) {
      return null;
    }
    try {
      const res = await API.post(
        '/api/v1/inex/user/refreshToken',
        {},
        {headers: {Authorization: `Bearer ${session.refreshToken}`}},
      );
      const payload = backendBody(res.data);
      if (!payload?.access_token) {
        return null;
      }
      const refreshed: StoredSession = {
        ...session,
        token: payload.access_token,
        refreshToken: payload.refresh_token || session.refreshToken,
      };
      await secureTokenStore.save(JSON.stringify(refreshed));
      return refreshed;
    } catch {
      return null;
    }
  })();
  try {
    return await backendSessionRefresh;
  } finally {
    backendSessionRefresh = null;
  }
};

const backendRequest = async <T,>(request: () => Promise<{data: T}>): Promise<T> => {
  try {
    return (await request()).data;
  } catch (e: any) {
    if ((e?.response?.status === 401 || e?.response?.status === 403) && await refreshBackendSession()) {
      try {
        return (await request()).data;
      } catch (retryError) {
        throw toApiError(retryError);
      }
    }
    throw toApiError(e);
  }
};

/**
 * Authenticated GET/POST against the Indexx backend, and the envelope
 * unwrapper for its `{status, data}` responses.
 *
 * Exported so feature modules that live outside this file (calls, for
 * instance) get the same 401-refresh-and-retry behaviour instead of
 * re-implementing it against a raw axios instance.
 */
export {backendGet as authedGet, backendPost as authedPost, backendBody as backendJson};

const backendGet = async <T,>(path: string, params?: Record<string, unknown>): Promise<T> => {
  return backendRequest(async () => API.get(path, {params, headers: await backendAuthHeaders()}));
};

const backendPost = async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
  return backendRequest(async () => API.post(path, body, {headers: await backendAuthHeaders()}));
};

const backendPatch = async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
  return backendRequest(async () => API.patch(path, body, {headers: await backendAuthHeaders()}));
};

const backendDelete = async <T,>(path: string, body?: Record<string, unknown>): Promise<T> => {
  return backendRequest(async () => API.delete(path, {data: body, headers: await backendAuthHeaders()}));
};

const withFallback = async <T,>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs = CHAT_OPTIONAL_TIMEOUT_MS,
): Promise<T> =>
  Promise.race([
    promise.catch(() => fallback),
    delay(timeoutMs).then(() => fallback),
  ]);

const safeUnreadCount = (value: unknown): number => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return Math.floor(count);
};

const backendUserToUser = (input: BackendUser, fallbackEmail?: string): User => {
  const email = normalizeEmail(input.email || fallbackEmail);
  const first = String(input.firstName || '').trim();
  const last = String(input.lastName || '').trim();
  const name =
    [first, last].filter(Boolean).join(' ') ||
    input.username ||
    email.split('@')[0] ||
    'Indexx user';
  return {
    id: email || String(input.id || input._id || ''),
    name,
    username: input.username || email.split('@')[0] || 'indexx_user',
    email,
    phone: input.phone,
    profilePic: input.profilePic,
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
      profilePic: payload?.profilePic,
    },
    email,
  );

const fallbackChatName = (email: string): string => {
  const username = normalizeEmail(email).split('@')[0];
  return username || 'Indexx user';
};

const backendUserName = (input: BackendUser, fallbackEmail?: string): string => {
  const user = backendUserToUser(input, fallbackEmail);
  return user.name === user.email ? fallbackChatName(user.email) : user.name;
};

const backendPeerName = async (email: string): Promise<string> => {
  const normalizedEmail = normalizeEmail(email);
  try {
    const payload = await backendGet<any>(
      `/api/v1/inex/user/getUserByEmail/${encodeURIComponent(normalizedEmail)}`,
    );
    return backendUserName(backendBody(payload), normalizedEmail);
  } catch {
    return fallbackChatName(normalizedEmail);
  }
};

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
    backendId: m._id ? String(m._id) : undefined,
    clientId: m.clientId,
    conversationId,
    senderId: mine ? db.ME_ID : senderEmail,
    kind: backendMessageKind(m),
    text: m.message || '',
    createdAt: new Date(m.timestamp || Date.now()).toISOString(),
    status: m.isRead ? 'read' : mine ? 'sent' : 'delivered',
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
  peerName?: string,
): Conversation => ({
  id: directConversationId(peerEmail),
  type: 'direct',
  title: peerName?.trim() || fallbackChatName(peerEmail),
  memberIds: [db.ME_ID, normalizeEmail(peerEmail)],
  lastMessage: last ? backendMessageToMessage(last, meEmail) : undefined,
  unreadCount: safeUnreadCount(unreadCount),
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
    unreadCount: safeUnreadCount(unreadCount),
    muted: false,
    pinned: false,
    archived: false,
    typingUserIds: [],
    groupRoles: group.createdBy ? {[normalizeEmail(group.createdBy)]: 'owner'} : undefined,
  };
};

const backendUnreadSummary = async (meEmail: string) => {
  return withFallback(
    backendGet<any>('/api/v1/chat/counts/unread', {email: meEmail}),
    {total: 0, direct: {perPeer: []}, groups: {perGroup: []}},
  );
};

const unreadForPeer = (summary: any, peerEmail: string): number => {
  const peer = normalizeEmail(peerEmail);
  return safeUnreadCount(
    summary?.direct?.perPeer?.find((x: any) => normalizeEmail(x.peerEmail) === peer)?.count || 0,
  );
};

const unreadForGroup = (summary: any, groupId: string): number =>
  safeUnreadCount(summary?.groups?.perGroup?.find((x: any) => String(x.groupId) === groupId)?.count || 0);

let backendPollVersions: Record<string, string> = {};

let backendChatSocket: Socket | null = null;
let backendChatSocketEmail: string | null = null;
let backendChatSocketConnect: Promise<Socket | null> | null = null;

const backendSocketUrl = (): string =>
  String(baseAPIURL || '')
    .replace(/\/api(?:\/.*)?$/i, '')
    .replace(/\/$/, '');

const backendSocketConversationId = (payload: any, meEmail: string): string | null => {
  const groupId = payload?.groupId;
  if (groupId) {
    return groupConversationId(String(groupId));
  }
  const peer = directPeerFromMessage(payload as BackendMessage, meEmail);
  return peer ? directConversationId(peer) : null;
};

const emitBackendConversationRefresh = (conversationId: string) => {
  backendChat
    .getConversation(conversationId)
    .then(conversation => emitChatEvent({type: 'conversation.updated', conversation}))
    .catch(() => {});
};

const handleBackendSocketMessage = (payload: any) => {
  const meEmail = backendChatSocketEmail;
  if (!meEmail || !payload) {
    return;
  }
  const message = backendMessageToMessage(payload as BackendMessage, meEmail);
  emitChatEvent({type: 'message.upsert', conversationId: message.conversationId, message});
  emitBackendConversationRefresh(message.conversationId);
};

const handleBackendSocketCounts = (payload: any) => {
  if (payload?.peerEmail) {
    emitBackendConversationRefresh(directConversationId(payload.peerEmail));
  }
  if (payload?.groupId) {
    emitBackendConversationRefresh(groupConversationId(String(payload.groupId)));
  }
};

const handleBackendSocketSnapshot = (payload: any) => {
  (payload?.groups || []).forEach((item: any) => {
    if (item?.groupId) {
      emitBackendConversationRefresh(groupConversationId(String(item.groupId)));
    }
  });
  (payload?.direct?.perPeer || []).forEach((item: any) => {
    if (item?.peerEmail) {
      emitBackendConversationRefresh(directConversationId(item.peerEmail));
    }
  });
};

const handleBackendSocketTyping = (payload: any) => {
  const meEmail = backendChatSocketEmail;
  if (!meEmail) {
    return;
  }
  const conversationId = payload?.conversationId || backendSocketConversationId(payload, meEmail);
  if (!conversationId) {
    return;
  }
  const userIds = (payload?.userIds || [payload?.email || payload?.senderEmail])
    .map(normalizeEmail)
    .filter((id: string) => id && id !== meEmail);
  emitChatEvent({type: 'typing.changed', conversationId, userIds});
};

const ensureBackendChatSocket = async (): Promise<Socket | null> => {
  if (!BACKEND_ENABLED) {
    return null;
  }
  const email = await backendSessionEmail();
  if (backendChatSocket?.connected && backendChatSocketEmail === email) {
    return backendChatSocket;
  }
  if (backendChatSocketConnect) {
    return backendChatSocketConnect;
  }

  backendChatSocketConnect = (async () => {
    if (backendChatSocket && backendChatSocketEmail !== email) {
      backendChatSocket.disconnect();
      backendChatSocket = null;
    }

    if (!backendChatSocket) {
      const socket = io(backendSocketUrl(), {
        path: CHAT_SOCKET_PATH,
        transports: ['websocket', 'polling'],
        auth: {email},
        query: {email},
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        timeout: 8000,
      });

      socket.on('message:new', handleBackendSocketMessage);
      socket.on('message:sent', handleBackendSocketMessage);
      socket.on('counts:direct', handleBackendSocketCounts);
      socket.on('counts:group', handleBackendSocketCounts);
      socket.on('counts:group:dirty', handleBackendSocketCounts);
      socket.on('counts:snapshot', handleBackendSocketSnapshot);
      socket.on('typing', handleBackendSocketTyping);
      socket.on('connect', () => socket.emit('counts:pull'));

      backendChatSocket = socket;
      backendChatSocketEmail = email;
    }

    return backendChatSocket;
  })();

  try {
    return await backendChatSocketConnect;
  } catch {
    return null;
  } finally {
    backendChatSocketConnect = null;
  }
};

/**
 * The live chat socket, for features that ride the same connection.
 *
 * Call signaling reuses it deliberately: one authenticated socket per device
 * means the server already knows who is on the other end, and a user's `user:`
 * room already reaches every device they are signed in on. Returns null when
 * the backend is disabled or the socket could not be established.
 */
export const sharedRealtimeSocket = (): Promise<Socket | null> => ensureBackendChatSocket();

/** Email the shared socket is authenticated as, or null when not connected. */
export const realtimeSocketEmail = (): string | null => backendChatSocketEmail;

const joinBackendSocketConversation = (conversationId: string) => {
  if (!isBackendGroupId(conversationId)) {
    return;
  }
  ensureBackendChatSocket()
    .then(socket => socket?.emit('group:join', groupIdFromConversationId(conversationId)))
    .catch(() => {});
};

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

  async signInWithPhone(phone: string, password: string): Promise<Session> {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 7) {
      throw new ApiError('Enter a valid phone number.', 'validation');
    }
    if (password.length < 6) {
      throw new ApiError('Password must be at least 6 characters.', 'validation');
    }
    if (BACKEND_ENABLED) {
      try {
        const res = await API.post('/api/v1/inex/user/loginWithPhone', {
          phone: normalizedPhone,
          password,
        });
        const payload = backendBody(res.data);
        if (!payload?.access_token) {
          throw new ApiError(payload?.message || 'Could not sign in.', 'unauthorized');
        }
        const session: StoredSession = {
          token: payload.access_token,
          refreshToken: payload.refresh_token,
          user: backendSessionToUser(payload, payload?.email || ''),
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
    return mockRequest('auth.signInWithPhone', () => {
      if (password === 'wrongpass') {
        throw new ApiError('Phone number or password is incorrect.', 'unauthorized');
      }
      const user = {...db.userById(db.ME_ID), phone: normalizedPhone};
      const session: Session = {token: 'mock-token', user, onboarded: true};
      secureTokenStore.save(JSON.stringify(session));
      return session;
    });
  },

  async signUp(input: {
    method: 'email' | 'phone';
    name: string;
    email?: string;
    phone?: string;
    profilePic?: string;
    password: string;
  }): Promise<Session> {
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedPhone = normalizePhone(input.phone);
    if (input.method === 'email' && !EMAIL_RE.test(normalizedEmail)) {
      throw new ApiError('Enter a valid email address.', 'validation');
    }
    if (input.method === 'phone' && !PHONE_RE.test(normalizedPhone)) {
      throw new ApiError('Enter a valid phone number.', 'validation');
    }
    if (BACKEND_ENABLED) {
      if (input.name.trim().length < 2) {
        throw new ApiError('Enter your name.', 'validation');
      }
      if (input.password.length < 8) {
        throw new ApiError('Password must be at least 8 characters.', 'validation');
      }
      try {
        const nameParts = input.name.trim().split(/\s+/);
        const uploadedPicture = input.profilePic
          ? await uploadProfilePicture(input.profilePic)
          : null;
        const identifier = input.method === 'email' ? normalizedEmail : normalizedPhone;
        const registrationPath = input.method === 'email'
          ? '/api/v1/inex/user/registerwithapp'
          : '/api/v1/inex/user/registerWithPhone';
        await API.post(registrationPath, {
          email: input.method === 'email' ? normalizedEmail : undefined,
          phone: input.method === 'phone' ? normalizedPhone : undefined,
          password: input.password,
          confirmPassword: input.password,
          username: signupUsername(identifier),
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' '),
          profilePicKey: uploadedPicture?.key,
          registerFrom: 'YaysApp',
        }, {timeout: 180000});
        const session = input.method === 'email'
          ? await this.signIn(normalizedEmail, input.password)
          : await this.signInWithPhone(normalizedPhone, input.password);
        if (uploadedPicture) {
          session.user.profilePic = uploadedPicture.publicUrl;
          await secureTokenStore.save(JSON.stringify(session));
        }
        return session;
      } catch (e) {
        if (e instanceof ApiError) {
          throw e;
        }
        throw toApiError(e);
      }
    }
    return mockRequest('auth.signUp', () => {
      if (input.name.trim().length < 2) {
        throw new ApiError('Enter your name.', 'validation');
      }
      if (input.password.length < 8) {
        throw new ApiError('Password must be at least 8 characters.', 'validation');
      }
      const user = db.userById(db.ME_ID);
      Object.assign(user, {
        name: input.name,
        email: input.method === 'email' ? normalizedEmail : user.email,
        phone: input.method === 'phone' ? normalizedPhone : undefined,
        profilePic: input.profilePic,
      });
      const session: Session = {
        token: 'mock-token',
        user: {...user},
        onboarded: false,
      };
      return session;
    });
  },

  /**
   * Verify an email or SMS one-time code.
   *
   * The channel is explicit rather than sniffed from the identifier, because
   * an account can be registered against both and verifying the wrong one
   * would report success while leaving the other unverified — which is what
   * contact discovery and account recovery actually depend on.
   */
  async verifyCode(
    code: string,
    target?: {channel: 'email' | 'phone'; identifier: string},
  ): Promise<void> {
    if (!/^\d{4,8}$/.test(code.trim())) {
      throw new ApiError('Enter the code we sent you.', 'validation');
    }
    if (BACKEND_ENABLED && target) {
      const path =
        target.channel === 'phone'
          ? '/api/v1/inex/user/validatePhoneOtp'
          : '/api/v1/inex/user/validateOtp';
      const body =
        target.channel === 'phone'
          ? {phone: normalizePhone(target.identifier), code: code.trim()}
          : {email: normalizeEmail(target.identifier), code: code.trim()};
      try {
        const res = await API.post(path, body);
        const payload = res.data;
        // These endpoints answer 200 with a failure message in some paths, so
        // the status alone is not proof the code was accepted.
        if (payload?.status && Number(payload.status) >= 400) {
          throw new ApiError(
            payload?.message || 'That code is not valid.',
            Number(payload.status) === 404 ? 'not_found' : 'validation',
          );
        }
        return;
      } catch (e) {
        if (e instanceof ApiError) {
          throw e;
        }
        throw toApiError(e);
      }
    }
    return mockRequest('auth.verifyCode', () => {
      if (code !== '123456') {
        throw new ApiError('That code is not valid. In this preview build use 123456.', 'validation');
      }
    });
  },

  /** Send (or re-send) a one-time code to an email address or phone number. */
  async sendCode(target: {channel: 'email' | 'phone'; identifier: string}): Promise<void> {
    if (target.channel === 'phone') {
      const {e164, error} = parsePhone(target.identifier);
      if (!e164) {
        throw new ApiError(error ?? 'Enter a valid phone number.', 'validation');
      }
      if (BACKEND_ENABLED) {
        try {
          await API.post('/api/v1/inex/user/sendPhoneOtp', {phone: e164});
          return;
        } catch (e) {
          throw toApiError(e);
        }
      }
    } else {
      const email = normalizeEmail(target.identifier);
      if (!EMAIL_RE.test(email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
      if (BACKEND_ENABLED) {
        try {
          await API.post('/api/v1/inex/user/sendOtp', {email});
          return;
        } catch (e) {
          throw toApiError(e);
        }
      }
    }
    return mockRequest('auth.sendCode', () => undefined);
  },

  async requestPasswordReset(email: string): Promise<void> {
    if (BACKEND_ENABLED) {
      if (!EMAIL_RE.test(email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
      try {
        await API.post('/api/v1/inex/user/sendForgotOtp', {
          email: normalizeEmail(email),
        });
        return;
      } catch (e) {
        throw toApiError(e);
      }
    }
    return mockRequest('auth.requestPasswordReset', () => {
      if (!EMAIL_RE.test(email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
    });
  },

  async resetPassword(email: string, code: string, password: string): Promise<void> {
    if (BACKEND_ENABLED) {
      if (!EMAIL_RE.test(email)) {
        throw new ApiError('Enter a valid email address.', 'validation');
      }
      if (!/^\d{6}$/.test(code)) {
        throw new ApiError('Enter the 6-digit code from your email.', 'validation');
      }
      if (password.length < 8) {
        throw new ApiError('Password must be at least 8 characters.', 'validation');
      }
      try {
        const normalizedEmail = normalizeEmail(email);
        await API.post('/api/v1/inex/user/validateForgotOtp', {
          email: normalizedEmail,
          code,
        });
        await API.post('/api/v1/inex/user/resetPassword', {
          email: normalizedEmail,
          code,
          password,
        });
        return;
      } catch (e) {
        throw toApiError(e);
      }
    }
    return mockRequest('auth.resetPassword', () => {
      if (code !== '123456') {
        throw new ApiError('That reset code is not valid. In this preview build use 123456.', 'validation');
      }
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
    if (BACKEND_ENABLED) {
      const stored = await loadStoredSession();
      if (!stored) {
        throw new ApiError('Your sign-up session expired. Please sign in again.', 'unauthorized');
      }
      await backendPost('/api/v1/inex/user/updateprofile/', {
        email: stored.user.email,
        updateData: {username: profile.username, bio: profile.bio},
      });
      const session: StoredSession = {
        ...stored,
        user: {...stored.user, username: profile.username, bio: profile.bio ?? stored.user.bio},
        onboarded: true,
      };
      await secureTokenStore.save(JSON.stringify(session));
      return session;
    }
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
      const session = await loadStoredSession();
      if (!session) {
        return null;
      }
      try {
        await API.post(
          '/api/v1/inex/user/validateUserToken',
          {},
          {headers: {Authorization: `Bearer ${session.token}`}},
        );
        return session;
      } catch (e: any) {
        if (e?.response?.status !== 401 && e?.response?.status !== 403) {
          return session;
        }
        const refreshed = await refreshBackendSession();
        if (refreshed) {
          return refreshed;
        }
        await secureTokenStore.clear();
        return null;
      }
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

const sortMessagesByCreatedAt = (messages: Message[]): Message[] =>
  [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

const backendChat = {
  async listConversations(filter: 'all' | 'unread' | 'groups' | 'archived' = 'all'): Promise<Conversation[]> {
    if (filter === 'archived') {
      return [];
    }
    const meEmail = await backendSessionEmail();
    const [latestPayload, groupsPayload, summary] = await Promise.all([
      withFallback(
        backendGet<any>(`/api/v1/chat/lastmessages/${encodeURIComponent(meEmail)}`, {limit: 20}),
        [],
      ),
      withFallback(backendGet<any>('/api/v1/chat/groups', {email: meEmail}), []),
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
      const peerName = await backendPeerName(peer);
      return backendDirectConversation(
        peer,
        meEmail,
        undefined,
        unreadForPeer(summary, peer),
        peerName,
      );
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

    if (isBackendGroupId(conversationId)) {
      try {
        const payload = await backendGet<any>(
          `/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}/messages/paged`,
          params,
        );
        const body = backendBody(payload);
        const rawMessages = (body?.messages || []) as BackendMessage[];
        const items = rawMessages.map(m => backendMessageToMessage(m, meEmail)).reverse();
        return {
          items,
          nextCursor: body?.hasMoreOlder ? body?.nextBeforeId || items[0]?.id || null : null,
        };
      } catch (e) {
        if (!(e instanceof ApiError) || e.code !== 'not_found') {
          throw e;
        }
        const payload = await backendGet<any>(
          `/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}/messages`,
          {email: meEmail},
        );
        const rawMessages = (backendBody(payload)?.messages || []) as BackendMessage[];
        return pageMessages(sortMessagesByCreatedAt(rawMessages.map(m => backendMessageToMessage(m, meEmail))), cursor);
      }
    }

    const peerEmail = directPeerFromId(conversationId);
    try {
      const payload = await backendGet<any>(
        `/api/v1/chat/messages/${encodeURIComponent(meEmail)}/paged`,
        {...params, with: peerEmail},
      );
      const body = backendBody(payload);
      const rawMessages = (body?.messages || []) as BackendMessage[];
      const items = rawMessages.map(m => backendMessageToMessage(m, meEmail)).reverse();
      return {
        items,
        nextCursor: body?.hasMoreOlder ? body?.nextBeforeId || items[0]?.id || null : null,
      };
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'not_found') {
        throw e;
      }
      const payload = await backendGet<any>(`/api/v1/chat/messages/${encodeURIComponent(meEmail)}`);
      const rawMessages = backendList(payload).filter(
        (m: BackendMessage) => !m.groupId && directPeerFromMessage(m, meEmail) === peerEmail,
      );
      return pageMessages(sortMessagesByCreatedAt(rawMessages.map(m => backendMessageToMessage(m, meEmail))), cursor);
    }
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
    joinBackendSocketConversation(conversationId);
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
    const savedPayload = isBackendGroupId(conversationId)
      ? await backendPost<BackendMessage>('/api/v1/chat/sendGroupmessage', {
          ...body,
          groupId: groupIdFromConversationId(conversationId),
        })
      : await backendPost<BackendMessage>('/api/v1/chat/messages', {
          ...body,
          to: directPeerFromId(conversationId),
        });
    const saved = backendBody(savedPayload);
    const message = {...backendMessageToMessage(saved, meEmail), clientId: input.clientId};
    emitChatEvent({type: 'message.upsert', conversationId, message});
    emitChatEvent({type: 'conversation.updated', conversation: await this.getConversation(conversationId)});
    ensureBackendChatSocket()
      .then(socket => socket?.emit('counts:pull'))
      .catch(() => {});
    return message;
  },

  async markRead(conversationId: string): Promise<void> {
    const meEmail = await backendSessionEmail();
    if (isBackendGroupId(conversationId)) {
      await backendPost(`/api/v1/chat/groups/${encodeURIComponent(groupIdFromConversationId(conversationId))}/read`, {
        email: meEmail,
      });
      ensureBackendChatSocket()
        .then(socket => {
          socket?.emit('group:markRead', {
            groupId: groupIdFromConversationId(conversationId),
            at: new Date().toISOString(),
          });
          socket?.emit('counts:pull');
        })
        .catch(() => {});
      return;
    }

    let cursor: string | undefined;
    const visitedCursors = new Set<string>();
    do {
      const page = await this.getMessages(conversationId, cursor);
      const unreadIds = page.items
        .filter(message => message.senderId !== db.ME_ID && message.status !== 'read')
        .map(message => message.backendId || message.id);
      if (unreadIds.length > 0) {
        await backendPost('/api/v1/chat/messages/read', {email: meEmail, messageIds: unreadIds});
      }

      const nextCursor = page.nextCursor ?? undefined;
      if (!nextCursor || visitedCursors.has(nextCursor)) {
        break;
      }
      visitedCursors.add(nextCursor);
      cursor = nextCursor;
    } while (cursor);
    ensureBackendChatSocket()
      .then(socket => socket?.emit('counts:pull'))
      .catch(() => {});
  },

  async getUnreadTotal(): Promise<number> {
    const meEmail = await backendSessionEmail();
    const summary = await backendGet<any>('/api/v1/chat/counts/unread', {email: meEmail});
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
      return backendDirectConversation(
        members[0],
        meEmail,
        undefined,
        0,
        await backendPeerName(members[0]),
      );
    }
    const groupPayload = await backendPost<BackendGroup>('/api/v1/chat/groups/custom', {
      creatorEmail: meEmail,
      groupName: title?.trim() || 'New group',
      memberEmails: members,
    });
    const group = backendBody(groupPayload);
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
    joinBackendSocketConversation(conversationId);
    let stopped = false;
    let inFlight = false;
    const poll = async () => {
      if (stopped || inFlight) {
        return;
      }
      inFlight = true;
      try {
        const page = await this.getMessages(conversationId);
        const version = page.items.map(m => `${m.id}:${m.status}:${m.edited}:${m.deleted}:${m.text}`).join('|');
        if (backendPollVersions[conversationId] && backendPollVersions[conversationId] !== version) {
          page.items.forEach(message => listener({type: 'message.upsert', conversationId, message}));
        }
        backendPollVersions[conversationId] = version;
      } catch {
        // Polling is best-effort; foreground refresh still works.
      } finally {
        inFlight = false;
      }
    };
    const id = setInterval(poll, 3000);
    poll();
    return () => {
      stopped = true;
      clearInterval(id);
    };
  },

  sendTyping(conversationId: string, typing = true): void {
    ensureBackendChatSocket()
      .then(socket => {
        if (!socket) {
          return;
        }
        if (isBackendGroupId(conversationId)) {
          socket.emit('typing', {
            groupId: groupIdFromConversationId(conversationId),
            typing,
          });
        } else {
          socket.emit('typing', {
            receiverEmail: directPeerFromId(conversationId),
            conversationId,
            typing,
          });
        }
      })
      .catch(() => {});
  },
};

export const chatService = {
  subscribe(listener: (event: ChatEvent) => void): () => void {
    if (BACKEND_ENABLED) {
      ensureBackendChatSocket().catch(() => {});
      chatListeners.add(listener);
      let stopped = false;
      let lastVersion = '';
      let inFlight = false;
      const poll = async () => {
        if (stopped || inFlight) {
          return;
        }
        inFlight = true;
        try {
          const list = await backendChat.listConversations('all');
          const version = list
            .map(c => `${c.id}:${c.lastMessage?.id}:${c.lastMessage?.status}:${c.lastMessage?.text}:${c.unreadCount}`)
            .join('|');
          if (lastVersion && lastVersion !== version) {
            list.forEach(conversation =>
              listener({type: 'conversation.updated', conversation}),
            );
          }
          lastVersion = version;
        } catch {
          // Chat-list polling is best-effort; screen focus still refreshes.
        } finally {
          inFlight = false;
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
      ensureBackendChatSocket().catch(() => {});
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
      ensureBackendChatSocket().catch(() => {});
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
      backendChat.sendTyping(conversationId, typing);
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
      try {
        const payload = await backendGet<any>(
          `/api/v1/inex/user/getProfileDetails/${encodeURIComponent(session.user.email)}`,
        );
        const freshProfile = backendUserToUser(backendBody(payload), session.user.email);
        const user = {...session.user, ...freshProfile};
        await secureTokenStore.save(JSON.stringify({...session, user}));
        return user;
      } catch {
        return session.user;
      }
    }
    return mockRequest('user.me', () => ({...db.userById(db.ME_ID)}));
  },

  async updateProfile(
    update: Partial<Pick<User, 'name' | 'bio' | 'username' | 'profilePic'>>,
  ): Promise<User> {
    if (BACKEND_ENABLED) {
      const session = await loadStoredSession();
      if (!session) {
        throw new ApiError('Please sign in again.', 'unauthorized');
      }
      const uploadedPicture =
        update.profilePic && isLocalProfilePicture(update.profilePic)
          ? await uploadProfilePicture(update.profilePic)
          : null;
      const savedUpdate = {
        ...update,
        profilePic: uploadedPicture?.publicUrl ?? update.profilePic,
      };
      const nameParts = update.name?.trim().split(/\s+/);
      await backendPost('/api/v1/inex/user/updateprofile/', {
        email: session.user.email,
        updateData: {
          username: update.username,
          bio: update.bio,
          firstName: nameParts?.[0],
          lastName: nameParts?.slice(1).join(' '),
          profilePicKey: uploadedPicture?.key,
          profilePic: uploadedPicture ? undefined : update.profilePic,
        },
      });
      const user = {...session.user, ...savedUpdate};
      await secureTokenStore.save(JSON.stringify({...session, user}));
      return user;
    }
    const user = await mockRequest('user.updateProfile', () => {
      const me = db.userById(db.ME_ID);
      Object.assign(me, update);
      return {...me};
    });
    const stored = await loadStoredSession().catch(() => null);
    if (stored) {
      await secureTokenStore.save(JSON.stringify({...stored, user}));
    }
    return user;
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

  async searchUsers(query: string): Promise<User[]> {
    const q = query.trim().toLowerCase();
    if (BACKEND_ENABLED) {
      const meEmail = await backendSessionEmail();
      if (!q) {
        return this.contacts();
      }
      try {
        const payload = await backendGet<any>('/api/v1/chat/users/search', {
          email: meEmail,
          q,
          limit: 25,
        });
        return backendList(payload)
          .map((u: BackendUser) => backendUserToUser(u))
          .filter(u => u.email && u.email !== meEmail);
      } catch {
        // Production may not have the new chat search route deployed yet.
      }
      if (EMAIL_RE.test(q)) {
        try {
          const payload = await backendGet<any>(`/api/v1/inex/user/getUserByEmail/${encodeURIComponent(q)}`);
          const user = backendUserToUser(backendBody(payload), q);
          return user.email && user.email !== meEmail ? [user] : [];
        } catch {
          return q !== meEmail
            ? [
                {
                  id: q,
                  name: q,
                  username: q.split('@')[0],
                  email: q,
                  bio: '',
                  online: false,
                  lastSeen: new Date().toISOString(),
                  isContact: false,
                },
              ]
            : [];
        }
      }
      if (/^[a-zA-Z0-9_]{3,30}$/.test(q)) {
        try {
          const payload = await backendGet<any>(`/api/v1/inex/user/getUserByUsername/${encodeURIComponent(q)}`);
          const user = backendUserToUser(backendBody(payload));
          return user.email && user.email !== meEmail ? [user] : [];
        } catch {
          return [];
        }
      }
      return [];
    }
    return mockRequest('user.searchUsers', () =>
      db.users
        .filter(u => u.id !== db.ME_ID && !db.blockedUsers.includes(u.id))
        .filter(
          u =>
            u.name.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q),
        ),
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
// Communities (Module 3)
//
// Backend-first with a local fallback, the same shape M5 uses for AI: the
// public `GET /api/v1/yays/communities/config` route is probed once, and a
// backend that predates M3 answers 404, after which the session is served by
// `localCommunities` — which implements the same contract, including roles,
// the publishing-approval workflow, invite expiry, and read counting.
//
// Screens never branch on which path is live. They read the flags the payload
// carries (`canPublishAnnouncement`, `canModerate`, `restricted`, `banned`),
// which both paths populate.
// ---------------------------------------------------------------------------

const COMMUNITY_BASE = '/api/v1/yays/communities';

/** null = not probed yet, true = M3 routes present, false = serve locally. */
let communityBackendAvailable: boolean | null = BACKEND_ENABLED ? null : false;
/** De-duplicates concurrent probes so the first render fires one request. */
let communityProbe: Promise<boolean> | null = null;

const communityCatalog = {
  categories: localCommunities.categories(),
  reportReasons: [
    'Spam',
    'Harassment',
    'Misinformation',
    'Inappropriate content',
    'Impersonation',
    'Other',
  ],
};

/** Test hook — forgets the backend probe and the cached catalogue. */
export const resetCommunityBackendProbe = () => {
  communityBackendAvailable = BACKEND_ENABLED ? null : false;
  communityProbe = null;
  communityCatalog.categories = localCommunities.categories();
};

/**
 * Resolve (and cache) whether the backend serves the M3 community routes.
 *
 * Only a 404 marks the module absent. A network failure leaves the answer
 * unresolved so a later call retries rather than stranding the session on the
 * local engine because the user was briefly offline.
 */
async function probeCommunityBackend(): Promise<boolean> {
  if (communityBackendAvailable !== null) {
    return communityBackendAvailable;
  }
  if (communityProbe) {
    return communityProbe;
  }
  communityProbe = (async () => {
    try {
      const payload = backendBody(await backendGet<any>(`${COMMUNITY_BASE}/config`));
      if (Array.isArray(payload?.categories) && payload.categories.length) {
        // 'All' is the discovery filter the client adds; the server lists only
        // real categories.
        communityCatalog.categories = ['All', ...payload.categories];
      }
      if (Array.isArray(payload?.reportReasons) && payload.reportReasons.length) {
        communityCatalog.reportReasons = payload.reportReasons;
      }
      communityBackendAvailable = true;
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'not_found') {
        communityBackendAvailable = false;
        return false;
      }
      return false;
    } finally {
      communityProbe = null;
    }
  })();
  return communityProbe;
}

/** Run `remote` when the backend serves the community routes, else `local`. */
async function viaCommunity<T>(
  remote: () => Promise<T>,
  local: () => T | Promise<T>,
): Promise<T> {
  return (await probeCommunityBackend()) ? remote() : local();
}

/**
 * Who the local engine attributes a write to.
 *
 * Mirrors `userService.me()` exactly — the mock profile when serving locally,
 * the stored session when the backend is live — so a post's author and the
 * profile the app shows can never disagree.
 */
const currentCommunityActor = async (): Promise<User> => {
  if (!BACKEND_ENABLED) {
    return {...db.userById(db.ME_ID)};
  }
  const session = await loadStoredSession().catch(() => null);
  return session?.user ?? db.userById(db.ME_ID);
};

const backendAnnouncement = (raw: any): Community['announcements'][number] => ({
  id: String(raw?.id || ''),
  title: String(raw?.title || ''),
  body: String(raw?.body || ''),
  postedAt: String(raw?.postedAt || new Date().toISOString()),
  status: raw?.status,
  scheduledFor: raw?.scheduledFor || undefined,
  audience: raw?.audience,
  region: raw?.region || undefined,
  actionLabel: raw?.actionLabel || undefined,
  actionUrl: raw?.actionUrl || undefined,
  readCount: Number(raw?.readCount) || 0,
  deliveredCount: Number(raw?.deliveredCount) || 0,
  readByMe: Boolean(raw?.readByMe),
  publisherName: raw?.publisherName || undefined,
  publisherVerified: Boolean(raw?.publisherVerified),
  approvedBy: raw?.approvedBy || undefined,
  rejectedReason: raw?.rejectedReason || undefined,
});

/**
 * Map a server community onto the client model.
 *
 * A discovery row carries no content arrays; defaulting them to `[]` keeps the
 * screens free of `?.` chains and means a summary and a detail render through
 * exactly the same components.
 */
const backendCommunity = (raw: any): Community => ({
  id: String(raw?.id || raw?.communityId || ''),
  slug: raw?.slug || undefined,
  name: String(raw?.name || 'Community'),
  category: String(raw?.category || 'Other'),
  description: String(raw?.description || ''),
  memberCount: Number(raw?.memberCount) || 0,
  privacy: raw?.privacy === 'private' ? 'private' : 'public',
  joined: Boolean(raw?.joined),
  joinRequested: Boolean(raw?.joinRequested),
  inviteOnly: Boolean(raw?.inviteOnly),
  role: raw?.role || undefined,
  verified: Boolean(raw?.verified),
  officialProduct: raw?.officialProduct || undefined,
  banned: Boolean(raw?.banned),
  restricted: Boolean(raw?.restricted),
  canPublishAnnouncement: Boolean(raw?.canPublishAnnouncement),
  canModerate: Boolean(raw?.canModerate),
  chatGroupId: raw?.chatGroupId || undefined,
  approvedPublisherIds: Array.isArray(raw?.approvedPublisherIds)
    ? raw.approvedPublisherIds.map(String)
    : [],
  joinRequests: Array.isArray(raw?.joinRequests)
    ? raw.joinRequests.map((request: any) => ({
        id: String(request?.id || ''),
        userName: String(request?.userName || ''),
        userEmail: String(request?.userEmail || ''),
        requestedAt: String(request?.requestedAt || new Date().toISOString()),
        status: request?.status || 'pending',
      }))
    : [],
  moderationReports: Array.isArray(raw?.moderationReports)
    ? raw.moderationReports.map((report: any) => ({
        id: String(report?.id || ''),
        targetType: report?.targetType || 'community',
        targetId: report?.targetId || undefined,
        reporterName: String(report?.reporterName || ''),
        reason: String(report?.reason || ''),
        excerpt: String(report?.excerpt || ''),
        createdAt: String(report?.createdAt || new Date().toISOString()),
        status: report?.status || 'open',
        assignedTo: report?.assignedTo || undefined,
      }))
    : [],
  bannedUserIds: Array.isArray(raw?.bannedUserIds) ? raw.bannedUserIds.map(String) : [],
  rules: Array.isArray(raw?.rules) ? raw.rules.map(String) : [],
  announcements: Array.isArray(raw?.announcements)
    ? raw.announcements.map(backendAnnouncement)
    : [],
  events: Array.isArray(raw?.events)
    ? raw.events.map((event: any) => ({
        id: String(event?.id || ''),
        title: String(event?.title || ''),
        description: event?.description || undefined,
        date: String(event?.date || new Date().toISOString()),
        location: event?.location || undefined,
        attending: Number(event?.attending) || 0,
        going: Boolean(event?.going),
      }))
    : [],
  polls: Array.isArray(raw?.polls)
    ? raw.polls.map((poll: any) => ({
        id: String(poll?.id || ''),
        question: String(poll?.question || ''),
        options: Array.isArray(poll?.options)
          ? poll.options.map((option: any) => ({
              label: String(option?.label || ''),
              votes: Number(option?.votes) || 0,
            }))
          : [],
        votedIndex:
          poll?.votedIndex === null || poll?.votedIndex === undefined
            ? undefined
            : Number(poll.votedIndex),
        closesAt: String(poll?.closesAt || new Date().toISOString()),
      }))
    : [],
  feed: Array.isArray(raw?.feed)
    ? raw.feed.map((post: any) => ({
        id: String(post?.id || ''),
        authorName: String(post?.authorName || ''),
        authorId: post?.authorId || undefined,
        body: String(post?.body || ''),
        postedAt: String(post?.postedAt || new Date().toISOString()),
        likes: Number(post?.likes) || 0,
        liked: Boolean(post?.liked),
        mine: Boolean(post?.mine),
      }))
    : [],
  inviteLink: String(raw?.inviteLink || ''),
  impersonationFlags: Array.isArray(raw?.impersonationFlags)
    ? raw.impersonationFlags
    : undefined,
});

const backendInvite = (raw: any): CommunityInvite => ({
  code: String(raw?.code || ''),
  url: String(raw?.url || ''),
  appUrl: String(raw?.appUrl || ''),
  maxUses: raw?.maxUses === null || raw?.maxUses === undefined ? null : Number(raw.maxUses),
  uses: Number(raw?.uses) || 0,
  expiresAt: raw?.expiresAt || null,
  revoked: Boolean(raw?.revoked),
});

const backendMember = (raw: any): CommunityMember => ({
  id: String(raw?.id || raw?.email || ''),
  email: String(raw?.email || ''),
  name: String(raw?.name || ''),
  username: String(raw?.username || ''),
  profilePic: raw?.profilePic || undefined,
  role: raw?.role || undefined,
  status: raw?.status || 'active',
  joinedAt: String(raw?.joinedAt || new Date().toISOString()),
  banReason: raw?.banReason || undefined,
});

export const communityService = {
  /** Categories for the discovery filter. Refreshed by the config probe. */
  categories(): string[] {
    return communityCatalog.categories;
  },

  /** Report reasons offered in the report sheet. */
  reportReasons(): string[] {
    return communityCatalog.reportReasons;
  },

  /**
   * Resolve the backend once and return the refreshed catalogue. Safe to call
   * on every tab mount: a failure leaves the cached local catalogue in place.
   */
  async loadCatalog(): Promise<string[]> {
    await probeCommunityBackend();
    return communityCatalog.categories;
  },

  /** True when the M3 routes are live; the Communities tab shows it in dev. */
  async backendLive(): Promise<boolean> {
    return probeCommunityBackend();
  },

  async discover(category?: string, query?: string): Promise<Community[]> {
    return viaCommunity(
      async () =>
        backendList(
          await backendGet<any>(COMMUNITY_BASE, {
            category: category && category !== 'All' ? category : undefined,
            q: query?.trim() || undefined,
          }),
        ).map(backendCommunity),
      () => mockRequest('community.discover', () => localCommunities.discover(category, query)),
    );
  },

  async myCommunities(): Promise<Community[]> {
    return viaCommunity(
      async () =>
        backendList(await backendGet<any>(`${COMMUNITY_BASE}/mine`)).map(backendCommunity),
      () => mockRequest('community.myCommunities', () => localCommunities.mine()),
    );
  },

  async get(id: string): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(backendBody(await backendGet<any>(`${COMMUNITY_BASE}/${id}`))),
      () => mockRequest('community.get', () => localCommunities.get(id)),
    );
  },

  async join(id: string): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(backendBody(await backendPost<any>(`${COMMUNITY_BASE}/${id}/join`))),
      () => mockRequest('community.join', () => localCommunities.join(id, actor)),
    );
  },

  async leave(id: string): Promise<void> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () => {
        await backendPost<any>(`${COMMUNITY_BASE}/${id}/leave`);
      },
      () => mockRequest('community.leave', () => localCommunities.leave(id, actor)),
    );
  },

  async create(input: {
    name: string;
    category: string;
    description: string;
    privacy: 'public' | 'private';
    inviteOnly?: boolean;
  }): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(backendBody(await backendPost<any>(COMMUNITY_BASE, input))),
      () =>
        mockRequest('community.create', () => localCommunities.create(input, actor).community),
    );
  },

  async update(
    id: string,
    input: Partial<Pick<Community, 'name' | 'description' | 'rules' | 'category' | 'privacy' | 'inviteOnly'>>,
  ): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(backendBody(await backendPatch<any>(`${COMMUNITY_BASE}/${id}`, input))),
      () => mockRequest('community.update', () => localCommunities.update(id, input).community),
    );
  },

  /** Verified-name collisions raised for the community as it stands now. */
  async impersonationFlags(id: string): Promise<ImpersonationFlag[]> {
    const community = await this.get(id);
    return community.impersonationFlags ?? [];
  },

  // -------------------------------------------------------------------------
  // Members and roles
  // -------------------------------------------------------------------------

  async members(communityId: string, query?: string): Promise<CommunityMember[]> {
    return viaCommunity(
      async () =>
        backendList(
          await backendGet<any>(`${COMMUNITY_BASE}/${communityId}/members`, {
            q: query?.trim() || undefined,
          }),
        ).map(backendMember),
      () =>
        mockRequest('community.members', () => localCommunities.members(communityId, query)),
    );
  },

  async setRole(
    communityId: string,
    userEmail: string,
    role: 'admin' | 'moderator' | 'member',
  ): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/members/role`, {
              userEmail,
              role,
            }),
          ),
        ),
      () =>
        mockRequest('community.setRole', () =>
          localCommunities.setRole(communityId, userEmail, role),
        ),
    );
  },

  async removeMember(
    communityId: string,
    userEmail: string,
    options: {ban?: boolean; reason?: string} = {},
  ): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/members/remove`, {
              userEmail,
              ban: !!options.ban,
              reason: options.reason,
            }),
          ),
        ),
      () =>
        mockRequest('community.removeMember', () =>
          localCommunities.removeMember(communityId, userEmail, options),
        ),
    );
  },

  async unbanMember(communityId: string, userEmail: string): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/members/unban`, {
              userEmail,
            }),
          ),
        ),
      () =>
        mockRequest('community.unbanMember', () =>
          localCommunities.unban(communityId, userEmail),
        ),
    );
  },

  async approveJoinRequest(
    communityId: string,
    requestId: string,
    approve = true,
  ): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(
              `${COMMUNITY_BASE}/${communityId}/requests/${requestId}`,
              {approve},
            ),
          ),
        ),
      () =>
        mockRequest('community.approveJoinRequest', () =>
          localCommunities.decideJoinRequest(communityId, requestId, approve),
        ),
    );
  },

  // -------------------------------------------------------------------------
  // Invite links
  // -------------------------------------------------------------------------

  async createInvite(
    communityId: string,
    options: {maxUses?: number | null; expiresInHours?: number | null} = {},
  ): Promise<CommunityInvite> {
    return viaCommunity(
      async () =>
        backendInvite(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/invites`, options),
          ),
        ),
      () =>
        mockRequest('community.createInvite', () =>
          localCommunities.createInvite(communityId, options),
        ),
    );
  },

  async listInvites(communityId: string): Promise<CommunityInvite[]> {
    return viaCommunity(
      async () =>
        backendList(await backendGet<any>(`${COMMUNITY_BASE}/${communityId}/invites`)).map(
          backendInvite,
        ),
      () =>
        mockRequest('community.listInvites', () => localCommunities.listInvites(communityId)),
    );
  },

  async revokeInvite(communityId: string, code: string): Promise<void> {
    return viaCommunity(
      async () => {
        await backendDelete<any>(`${COMMUNITY_BASE}/${communityId}/invites/${code}`);
      },
      () =>
        mockRequest('community.revokeInvite', () =>
          localCommunities.revokeInvite(communityId, code),
        ),
    );
  },

  async previewInvite(
    code: string,
  ): Promise<{community: Community; valid: boolean; reason?: string}> {
    return viaCommunity<{community: Community; valid: boolean; reason?: string}>(
      async () => {
        const payload = backendBody(
          await backendGet<any>(`${COMMUNITY_BASE}/invites/preview`, {code}),
        );
        return {
          community: backendCommunity(payload?.community),
          valid: Boolean(payload?.valid),
          reason: payload?.reason || undefined,
        };
      },
      () => mockRequest('community.previewInvite', () => localCommunities.previewInvite(code)),
    );
  },

  async acceptInvite(code: string): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(await backendPost<any>(`${COMMUNITY_BASE}/invites/accept`, {code})),
        ),
      () =>
        mockRequest('community.acceptInvite', () =>
          localCommunities.acceptInvite(code, actor),
        ),
    );
  },

  // -------------------------------------------------------------------------
  // Feed, polls, events
  // -------------------------------------------------------------------------

  /**
   * Post to the community feed.
   *
   * The author is taken from the session, never from the caller: a client that
   * could name itself could sign a post as "BTCY Official".
   */
  async postToFeed(communityId: string, body: string): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/posts`, {body}),
          ),
        ),
      () => mockRequest('community.postToFeed', () => localCommunities.post(communityId, body, actor)),
    );
  },

  async likePost(
    communityId: string,
    postId: string,
  ): Promise<{liked: boolean; likes: number}> {
    return viaCommunity(
      async () =>
        backendBody(
          await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/posts/${postId}/like`),
        ) as {liked: boolean; likes: number},
      () =>
        mockRequest('community.likePost', () =>
          localCommunities.likePost(communityId, postId),
        ),
    );
  },

  async removePost(
    communityId: string,
    postId: string,
    reason?: string,
  ): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendDelete<any>(`${COMMUNITY_BASE}/${communityId}/posts/${postId}`, {
              reason,
            }),
          ),
        ),
      () =>
        mockRequest('community.removePost', () =>
          localCommunities.removePost(communityId, postId),
        ),
    );
  },

  async createPoll(
    communityId: string,
    input: {question: string; options: string[]; closesInHours?: number},
  ): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/polls`, input),
          ),
        ),
      () =>
        mockRequest('community.createPoll', () =>
          localCommunities.createPoll(communityId, input),
        ),
    );
  },

  async vote(communityId: string, pollId: string, optionIndex: number): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(
              `${COMMUNITY_BASE}/${communityId}/polls/${pollId}/vote`,
              {optionIndex},
            ),
          ),
        ),
      () =>
        mockRequest('community.vote', () =>
          localCommunities.vote(communityId, pollId, optionIndex),
        ),
    );
  },

  async createEvent(
    communityId: string,
    input: {title: string; description?: string; startsAt: string; location?: string},
  ): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/events`, input),
          ),
        ),
      () =>
        mockRequest('community.createEvent', () =>
          localCommunities.createEvent(communityId, input),
        ),
    );
  },

  async rsvp(communityId: string, eventId: string, attending: boolean): Promise<Community> {
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(
              `${COMMUNITY_BASE}/${communityId}/events/${eventId}/rsvp`,
              {attending},
            ),
          ),
        ),
      () =>
        mockRequest('community.rsvp', () =>
          localCommunities.rsvp(communityId, eventId, attending),
        ),
    );
  },

  // -------------------------------------------------------------------------
  // Announcements
  // -------------------------------------------------------------------------

  async publishAnnouncement(
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
  ): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/announcements`, input),
          ),
        ),
      () =>
        mockRequest('community.publishAnnouncement', () =>
          localCommunities.publishAnnouncement(communityId, input, actor),
        ),
    );
  },

  async approveAnnouncement(
    communityId: string,
    announcementId: string,
    approve: boolean,
    reason?: string,
  ): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(
              `${COMMUNITY_BASE}/${communityId}/announcements/${announcementId}/approve`,
              {approve, reason},
            ),
          ),
        ),
      () =>
        mockRequest('community.approveAnnouncement', () =>
          localCommunities.approveAnnouncement(
            communityId,
            announcementId,
            approve,
            reason,
            actor,
          ),
        ),
    );
  },

  async readAnnouncement(
    communityId: string,
    announcementId: string,
    actioned = false,
  ): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(
              `${COMMUNITY_BASE}/${communityId}/announcements/${announcementId}/read`,
              {actioned},
            ),
          ),
        ),
      () =>
        mockRequest('community.readAnnouncement', () =>
          localCommunities.readAnnouncement(communityId, announcementId, actor),
        ),
    );
  },

  async announcementStats(
    communityId: string,
    announcementId: string,
  ): Promise<AnnouncementStats> {
    return viaCommunity(
      async () =>
        backendBody(
          await backendGet<any>(
            `${COMMUNITY_BASE}/${communityId}/announcements/${announcementId}/stats`,
          ),
        ) as AnnouncementStats,
      () =>
        mockRequest('community.announcementStats', () =>
          localCommunities.announcementStats(communityId, announcementId),
        ),
    );
  },

  // -------------------------------------------------------------------------
  // Reporting and moderation
  // -------------------------------------------------------------------------

  async report(
    communityId: string,
    reason: string,
    target: {
      targetType?: 'community' | 'post' | 'member' | 'announcement';
      targetId?: string;
      excerpt?: string;
    } = {},
  ): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(`${COMMUNITY_BASE}/${communityId}/reports`, {
              reason,
              ...target,
            }),
          ),
        ),
      () =>
        mockRequest('community.report', () =>
          localCommunities.report(communityId, {reason, ...target}, actor),
        ),
    );
  },

  async resolveReport(
    communityId: string,
    reportId: string,
    resolution: 'approved' | 'removed' | 'dismissed',
  ): Promise<Community> {
    const actor = await currentCommunityActor();
    return viaCommunity(
      async () =>
        backendCommunity(
          backendBody(
            await backendPost<any>(
              `${COMMUNITY_BASE}/${communityId}/reports/${reportId}/resolve`,
              {resolution},
            ),
          ),
        ),
      () =>
        mockRequest('community.resolveReport', () =>
          localCommunities.resolveReport(communityId, reportId, resolution, actor),
        ),
    );
  },

  /**
   * The conversation id for a community's chat.
   *
   * Community chat is an ordinary M2 group conversation, so the chat screen,
   * sockets, receipts, and push all work unchanged. `null` means the community
   * has no backing group yet (a locally-served session), and the caller shows
   * the local preview instead.
   */
  chatConversationId(community: Community): string | null {
    if (!community.chatGroupId || community.chatGroupId.startsWith('mock-')) {
      return null;
    }
    return `group:${community.chatGroupId}`;
  },
};

// ---------------------------------------------------------------------------
// AI (Module 5)
//
// Backend-first with a local fallback. Availability is decided once, by probing
// the public `GET /api/v1/ai/config` route: a backend that predates M5 answers
// 404 and the session is served from `localEngine`, which implements the same
// contract. Screens never branch on which path is live — they read
// `aiService.providerStatus()`.
//
// The probe is deliberately separate from the data calls: a 404 from, say,
// `GET /conversations/:id` means that conversation is gone, not that the module
// is missing, and must not demote the whole session.
// ---------------------------------------------------------------------------

const AI_BASE = '/api/v1/ai';

/** null = not probed yet, true = M5 routes present, false = serve locally. */
let aiBackendAvailable: boolean | null = BACKEND_ENABLED ? null : false;
/** De-duplicates concurrent probes so the first render only fires one request. */
let aiProbe: Promise<boolean> | null = null;

const aiCatalog = {
  tools: localEngine.tools(),
  suggestedPrompts: localEngine.suggestedPrompts(),
  provider: localEngine.providerStatus() as AiProviderStatus,
};

/** Test hook — forgets the backend probe and the cached catalogue. */
export const resetAiBackendProbe = () => {
  aiBackendAvailable = BACKEND_ENABLED ? null : false;
  aiProbe = null;
  aiCatalog.tools = localEngine.tools();
  aiCatalog.suggestedPrompts = localEngine.suggestedPrompts();
  aiCatalog.provider = localEngine.providerStatus();
};

/**
 * Resolve (and cache) whether the backend serves the M5 AI routes, refreshing
 * the tool catalogue and provider status as a side effect.
 *
 * Only a 404 marks the module absent. A network failure leaves the answer
 * unresolved so a later call can retry rather than stranding the session on the
 * local engine because the user was briefly offline.
 */
async function probeAiBackend(): Promise<boolean> {
  if (aiBackendAvailable !== null) {
    return aiBackendAvailable;
  }
  if (aiProbe) {
    return aiProbe;
  }
  aiProbe = (async () => {
    try {
      const payload = backendBody(await backendGet<any>(`${AI_BASE}/config`));
      if (Array.isArray(payload?.tools) && payload.tools.length) {
        aiCatalog.tools = payload.tools as AiTool[];
      }
      if (Array.isArray(payload?.suggestedPrompts) && payload.suggestedPrompts.length) {
        aiCatalog.suggestedPrompts = payload.suggestedPrompts as string[];
      }
      if (payload?.provider) {
        aiCatalog.provider = payload.provider as AiProviderStatus;
      }
      aiBackendAvailable = true;
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'not_found') {
        aiBackendAvailable = false;
        return false;
      }
      // Transient failure — stay unresolved and fall back for this call only.
      return false;
    } finally {
      aiProbe = null;
    }
  })();
  return aiProbe;
}

/** Run `remote` when the backend serves the AI routes, otherwise `local`. */
async function viaAi<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  return (await probeAiBackend()) ? remote() : local();
}

const backendAiMessage = (raw: any): AiMessage => ({
  id: String(raw?.messageId || raw?.id || db.nextId('am')),
  role: raw?.role === 'assistant' ? 'assistant' : 'user',
  text: String(raw?.text || ''),
  createdAt: String(raw?.createdAt || new Date().toISOString()),
  degraded: Boolean(raw?.degraded),
});

const backendAiConversation = (raw: any): AiConversation => ({
  id: String(raw?._id || raw?.id || ''),
  title: String(raw?.title || 'AI session'),
  tool: String(raw?.tool || 'ask'),
  saved: Boolean(raw?.saved),
  updatedAt: String(raw?.updatedAt || new Date().toISOString()),
  messages: Array.isArray(raw?.messages) ? raw.messages.map(backendAiMessage) : [],
  costUsd: Number(raw?.costUsd) || 0,
});

const backendTicket = (raw: any): SupportTicket => ({
  id: String(raw?._id || raw?.id || ''),
  subject: String(raw?.subject || 'Support request'),
  product: String(raw?.product || 'YaysApp'),
  status: (raw?.status as SupportTicket['status']) || 'ai_handling',
  escalatedAt: raw?.escalatedAt ? String(raw.escalatedAt) : null,
  updatedAt: String(raw?.updatedAt || new Date().toISOString()),
  messages: Array.isArray(raw?.messages)
    ? raw.messages.map((m: any) => ({
        id: String(m?.messageId || m?.id || db.nextId('sm')),
        author: (m?.author as SupportTicketMessage['author']) || 'ai',
        text: String(m?.text || ''),
        createdAt: String(m?.createdAt || new Date().toISOString()),
      }))
    : [],
});

export const aiService = {
  /** Tool tiles for the hub. Refreshed by `loadCatalog()`. */
  tools: (): AiTool[] => aiCatalog.tools,
  suggestedPrompts: (): string[] => aiCatalog.suggestedPrompts,
  /** Which provider is answering — `live: false` means offline answers. */
  providerStatus: (): AiProviderStatus => aiCatalog.provider,

  /**
   * Pull the tool catalogue and provider status. Safe to call on every hub
   * mount: a failure leaves the cached local catalogue in place, so the hub
   * always renders something.
   */
  async loadCatalog(): Promise<AiProviderStatus> {
    await probeAiBackend();
    return aiCatalog.provider;
  },

  async usage(): Promise<AiUsage> {
    return viaAi(
      async () => backendBody(await backendGet<any>(`${AI_BASE}/usage`)) as AiUsage,
      () => localEngine.usage(),
    );
  },

  async consent(): Promise<AiConsent> {
    return viaAi(
      async () => backendBody(await backendGet<any>(`${AI_BASE}/consent`)) as AiConsent,
      () => localEngine.consent(),
    );
  },

  async updateConsent(patch: Partial<AiConsent>): Promise<AiConsent> {
    return viaAi(
      async () =>
        backendBody(await backendPost<any>(`${AI_BASE}/consent`, patch)) as AiConsent,
      () => localEngine.updateConsent(patch),
    );
  },

  async history(): Promise<AiConversation[]> {
    return viaAi(
      async () => {
        const rows = backendBody(await backendGet<any>(`${AI_BASE}/conversations`));
        return Array.isArray(rows) ? rows.map(backendAiConversation) : [];
      },
      () => localEngine.history(),
    );
  },

  async get(id: string): Promise<AiConversation> {
    return viaAi(
      async () =>
        backendAiConversation(
          backendBody(await backendGet<any>(`${AI_BASE}/conversations/${id}`)),
        ),
      () => localEngine.conversation(id),
    );
  },

  async start(tool: string, firstPrompt?: string): Promise<AiConversation> {
    return viaAi(
      async () =>
        backendAiConversation(
          backendBody(await backendPost<any>(`${AI_BASE}/conversations`, {tool, firstPrompt})),
        ),
      () => localEngine.startConversation(tool, firstPrompt),
    );
  },

  async send(
    conversationId: string,
    text: string,
    _toolId?: string,
    userNameOverride?: string,
  ): Promise<AiConversation> {
    const session = await loadStoredSession().catch(() => null);
    const userName =
      userNameOverride?.trim() || session?.user?.name?.trim() || 'You';
    return viaAi(
      async () => {
        const payload = backendBody(
          await backendPost<any>(`${AI_BASE}/conversations/${conversationId}/messages`, {text}),
        );
        return backendAiConversation(payload?.conversation);
      },
      () => localEngine.sendMessage(conversationId, text, userName),
    );
  },

  async setSaved(id: string, saved: boolean): Promise<void> {
    await viaAi(
      async () => {
        await backendPost(`${AI_BASE}/conversations/${id}/saved`, {saved});
      },
      () => localEngine.setSaved(id, saved),
    );
  },

  async remove(id: string): Promise<void> {
    await viaAi(
      async () => {
        await backendDelete(`${AI_BASE}/conversations/${id}`);
      },
      () => localEngine.remove(id),
    );
  },

  /**
   * One-shot assist over content the user explicitly shared from a chat or a
   * community. Throws `consent_required` until the matching switch is on.
   */
  async assist(options: {
    kind: 'summarize_conversation' | 'translate_message';
    content: string;
    scope: 'chat' | 'community';
  }): Promise<AiAssistResult> {
    return viaAi(
      async () =>
        backendBody(await backendPost<any>(`${AI_BASE}/assist`, options)) as AiAssistResult,
      () => localEngine.assist(options),
    );
  },

  /** Report an AI answer for human review. */
  async reportAnswer(options: {
    reason: string;
    excerpt: string;
    conversationId?: string;
    messageId?: string;
  }): Promise<void> {
    await viaAi(
      async () => {
        await backendPost(`${AI_BASE}/reports`, options);
      },
      () => localEngine.reportAnswer(options.reason, options.excerpt),
    );
  },

  // --- Support desk ---------------------------------------------------------

  async tickets(): Promise<SupportTicket[]> {
    return viaAi(
      async () => {
        const rows = backendBody(await backendGet<any>(`${AI_BASE}/support/tickets`));
        return Array.isArray(rows) ? rows.map(backendTicket) : [];
      },
      () => localEngine.tickets(),
    );
  },

  async createTicket(options: {
    subject: string;
    text: string;
    product?: string;
  }): Promise<SupportTicket> {
    const product = options.product || 'YaysApp';
    return viaAi(
      async () => {
        const payload = backendBody(
          await backendPost<any>(`${AI_BASE}/support/tickets`, {...options, product}),
        );
        return backendTicket(payload?.ticket);
      },
      () => localEngine.createTicket(options.subject, options.text, product),
    );
  },

  async replyToTicket(ticketId: string, text: string): Promise<SupportTicket> {
    return viaAi(
      async () => {
        const payload = backendBody(
          await backendPost<any>(`${AI_BASE}/support/tickets/${ticketId}/messages`, {text}),
        );
        return backendTicket(payload?.ticket);
      },
      () => localEngine.replyToTicket(ticketId, text),
    );
  },

  async escalateTicket(ticketId: string, reason: string): Promise<SupportTicket> {
    return viaAi(
      async () =>
        backendTicket(
          backendBody(
            await backendPost<any>(`${AI_BASE}/support/tickets/${ticketId}/escalate`, {reason}),
          ),
        ),
      () => localEngine.escalateTicket(ticketId, reason),
    );
  },

  /** Used by Profile → AI settings when the user clears their AI history. */
  async clearHistory(): Promise<void> {
    if (aiBackendAvailable === false) {
      localEngine.clearHistory();
      return;
    }
    const existing = await this.history();
    await Promise.all(existing.map(conversation => this.remove(conversation.id)));
  },
};

// ---------------------------------------------------------------------------
// Rewards: Earn, Wallet, and Referrals
//
// Backend-first with a local fallback, on the same rule as AI and M6: the
// public `GET /api/v1/yays/wallet/config` route decides availability once per
// session. A deployment that predates this module answers 404 and the session
// is served from the local preview data, which implements the same contract.
//
// The distinction matters more here than elsewhere — these screens show
// balances. `dataMode` records which side answered so the UI can show the
// "simulated data" banner when, and only when, the numbers are not real.
// ---------------------------------------------------------------------------

const REWARDS_BASE = '/api/v1/yays/wallet';

/** `null` = not yet probed. `false` = the deployment does not serve rewards yet. */
let rewardsBackendAvailable: boolean | null = BACKEND_ENABLED ? null : false;
let rewardsProbe: Promise<boolean> | null = null;

/** Reward rules from the backend; the local defaults mirror the server's. */
let rewardsConfig = {
  pointsUnit: 'IndexxPoints',
  dailyLimit: 500,
  checkInPoints: 20,
  referral: {referrerReward: 250, refereeWelcome: 100, miningStationTarget: 5},
};

/** Test hook — forgets the rewards probe. */
export const resetRewardsBackendProbe = () => {
  rewardsBackendAvailable = BACKEND_ENABLED ? null : false;
  rewardsProbe = null;
  dataMode.set('rewards', false);
};

async function probeRewardsBackend(): Promise<boolean> {
  if (rewardsBackendAvailable !== null) {
    return rewardsBackendAvailable;
  }
  if (rewardsProbe) {
    return rewardsProbe;
  }
  rewardsProbe = (async () => {
    try {
      const payload = backendBody(await backendGet<any>(`${REWARDS_BASE}/config`));
      if (payload) {
        rewardsConfig = {
          pointsUnit: String(payload.pointsUnit || rewardsConfig.pointsUnit),
          dailyLimit: Number(payload.dailyLimit ?? rewardsConfig.dailyLimit),
          checkInPoints: Number(payload.checkInPoints ?? rewardsConfig.checkInPoints),
          referral: {
            referrerReward: Number(
              payload.referral?.referrerReward ?? rewardsConfig.referral.referrerReward,
            ),
            refereeWelcome: Number(
              payload.referral?.refereeWelcome ?? rewardsConfig.referral.refereeWelcome,
            ),
            miningStationTarget: Number(
              payload.referral?.miningStationTarget ??
                rewardsConfig.referral.miningStationTarget,
            ),
          },
        };
      }
      rewardsBackendAvailable = true;
      dataMode.set('rewards', true);
      return true;
    } catch (e) {
      // Only a 404 proves the module is absent. A network blip leaves the
      // answer unresolved so the next call retries instead of stranding the
      // session on preview balances because the user was briefly offline.
      if (e instanceof ApiError && e.code === 'not_found') {
        rewardsBackendAvailable = false;
        dataMode.set('rewards', false);
        return false;
      }
      return false;
    } finally {
      rewardsProbe = null;
    }
  })();
  return rewardsProbe;
}

async function viaRewards<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  return (await probeRewardsBackend()) ? remote() : local();
}

/** The reward rules screens quote back to the user. */
export const rewardRules = () => ({...rewardsConfig});

const backendRewardEntry = (raw: any): RewardEntry => ({
  id: String(raw?.id || raw?._id || db.nextId('r')),
  activity: String(raw?.activity || 'Reward'),
  amount: Number(raw?.amount) || 0,
  unit: 'IndexxPoints',
  status: (raw?.status === 'pending' || raw?.status === 'reversed'
    ? raw.status
    : 'completed') as RewardEntry['status'],
  createdAt: String(raw?.createdAt || new Date().toISOString()),
  note: raw?.note || undefined,
});

const REFERRAL_DISPLAY_STATUS: Record<string, RewardStatus> = {
  pending: 'pending',
  qualified: 'completed',
  rewarded: 'completed',
  rejected: 'reversed',
};

const backendEarnSummary = (raw: any): EarnSummary => ({
  balance: Number(raw?.balance) || 0,
  streakDays: Number(raw?.streakDays) || 0,
  checkedInToday: Boolean(raw?.checkedInToday),
  dailyLimit: Number(raw?.dailyLimit ?? rewardsConfig.dailyLimit),
  earnedToday: Number(raw?.earnedToday) || 0,
  referralCode: String(raw?.referralCode || ''),
  referrals: (raw?.referrals || []).map((item: any) => ({
    name: String(item?.name || 'Friend'),
    joinedAt: String(item?.joinedAt || new Date().toISOString()),
    reward: Number(item?.reward) || 0,
    status: REFERRAL_DISPLAY_STATUS[String(item?.status)] ?? 'pending',
  })),
  campaigns: (raw?.campaigns || []).map((item: any) => ({
    id: String(item?.id || db.nextId('camp')),
    title: String(item?.title || ''),
    description: String(item?.description || ''),
    endsAt: String(item?.endsAt || new Date().toISOString()),
    reward: String(item?.reward || ''),
  })),
});

const backendEarnActivity = (raw: any): EarnActivity => ({
  id: String(raw?.id || db.nextId('act')),
  title: String(raw?.title || ''),
  description: String(raw?.description || ''),
  reward: String(raw?.reward || ''),
  icon: String(raw?.icon || 'star'),
  status: (['available', 'completed_today', 'coming_soon', 'limit_reached'].includes(
    String(raw?.status),
  )
    ? raw.status
    : 'coming_soon') as EarnActivity['status'],
  progress: raw?.progress
    ? {current: Number(raw.progress.current) || 0, target: Number(raw.progress.target) || 1}
    : undefined,
});

export const earnService = {
  async summary(): Promise<EarnSummary> {
    return viaRewards(
      async () => backendEarnSummary(backendBody(await backendGet<any>(`${REWARDS_BASE}/earn/summary`))),
      () =>
        mockRequest('earn.summary', () => ({
          ...db.earnSummary,
          referrals: [...db.earnSummary.referrals],
          campaigns: [...db.earnSummary.campaigns],
        })),
    );
  },

  async activities(): Promise<EarnActivity[]> {
    return viaRewards(
      async () => {
        const payload = backendBody(await backendGet<any>(`${REWARDS_BASE}/earn/activities`));
        return (payload?.items || []).map(backendEarnActivity);
      },
      () => mockRequest('earn.activities', () => db.earnActivities.map(a => ({...a}))),
    );
  },

  async checkIn(): Promise<EarnSummary> {
    return viaRewards(
      async () =>
        backendEarnSummary(backendBody(await backendPost<any>(`${REWARDS_BASE}/earn/check-in`))),
      () =>
        mockRequest('earn.checkIn', () => {
          if (db.earnSummary.checkedInToday) {
            throw new ApiError('You already checked in today. Come back tomorrow!', 'validation');
          }
          db.earnSummary.checkedInToday = true;
          db.earnSummary.streakDays += 1;
          db.earnSummary.balance += rewardsConfig.checkInPoints;
          db.earnSummary.earnedToday += rewardsConfig.checkInPoints;
          db.rewardHistory.unshift({
            id: db.nextId('r'),
            activity: 'Daily check-in',
            amount: rewardsConfig.checkInPoints,
            unit: 'IndexxPoints',
            status: 'completed',
            createdAt: new Date().toISOString(),
          });
          const act = db.earnActivities.find(a => a.id === 'act_checkin');
          if (act) {
            act.status = 'completed_today';
          }
          return {...db.earnSummary};
        }),
    );
  },

  /**
   * Claim a finished activity's reward.
   *
   * The server re-checks the activity's real counter before paying, so a client
   * that claims early gets a 409 rather than points.
   */
  async claim(activityId: string): Promise<{awarded: number; summary: EarnSummary}> {
    return viaRewards(
      async () => {
        const payload = backendBody(
          await backendPost<any>(`${REWARDS_BASE}/earn/activities/${activityId}/claim`),
        );
        return {
          awarded: Number(payload?.awarded) || 0,
          summary: backendEarnSummary(payload?.summary),
        };
      },
      () =>
        mockRequest('earn.claim', () => {
          const activity = db.earnActivities.find(a => a.id === activityId);
          if (!activity) {
            throw new ApiError('That activity is not available.', 'not_found');
          }
          if (activity.status !== 'available') {
            throw new ApiError('That activity is not ready to claim yet.', 'validation');
          }
          const awarded = Number(String(activity.reward).replace(/[^0-9]/g, '')) || 0;
          activity.status = 'completed_today';
          db.earnSummary.balance += awarded;
          db.earnSummary.earnedToday += awarded;
          db.rewardHistory.unshift({
            id: db.nextId('r'),
            activity: activity.title,
            amount: awarded,
            unit: 'IndexxPoints',
            status: 'completed',
            createdAt: new Date().toISOString(),
          });
          return {awarded, summary: {...db.earnSummary}};
        }),
    );
  },

  async history(): Promise<RewardEntry[]> {
    return viaRewards(
      async () => {
        const payload = backendBody(
          await backendGet<any>(`${REWARDS_BASE}/earn/rewards`, {limit: 50}),
        );
        return (payload?.items || []).map(backendRewardEntry);
      },
      () => mockRequest('earn.history', () => [...db.rewardHistory]),
    );
  },

  async rewardDetail(id: string): Promise<RewardEntry> {
    return viaRewards(
      async () =>
        backendRewardEntry(backendBody(await backendGet<any>(`${REWARDS_BASE}/earn/rewards/${id}`))),
      () =>
        mockRequest('earn.rewardDetail', () => {
          const r = db.rewardHistory.find(x => x.id === id);
          if (!r) {
            throw new ApiError('Reward not found.', 'not_found');
          }
          return r;
        }),
    );
  },
};

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

export interface ReferralSummary {
  code: string;
  rewardPerReferral: number;
  welcomeBonus: number;
  miningStationTarget: number;
  stats: {total: number; pending: number; active: number; pointsEarned: number};
  items: {name: string; joinedAt: string; reward: number; status: RewardStatus}[];
}

const localReferralSummary = (): ReferralSummary => ({
  code: db.earnSummary.referralCode,
  rewardPerReferral: rewardsConfig.referral.referrerReward,
  welcomeBonus: rewardsConfig.referral.refereeWelcome,
  miningStationTarget: rewardsConfig.referral.miningStationTarget,
  stats: {
    total: db.earnSummary.referrals.length,
    pending: db.earnSummary.referrals.filter(r => r.status === 'pending').length,
    active: db.earnSummary.referrals.filter(r => r.status === 'completed').length,
    pointsEarned: db.earnSummary.referrals
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.reward, 0),
  },
  items: db.earnSummary.referrals.map(r => ({...r})),
});

export const referralService = {
  async summary(): Promise<ReferralSummary> {
    return viaRewards(
      async () => {
        const payload = backendBody(await backendGet<any>(`${REWARDS_BASE}/referrals`));
        return {
          code: String(payload?.code || ''),
          rewardPerReferral: Number(payload?.rewardPerReferral) || 0,
          welcomeBonus: Number(payload?.welcomeBonus) || 0,
          miningStationTarget: Number(payload?.miningStationTarget) || 5,
          stats: {
            total: Number(payload?.stats?.total) || 0,
            pending: Number(payload?.stats?.pending) || 0,
            active: Number(payload?.stats?.active) || 0,
            pointsEarned: Number(payload?.stats?.pointsEarned) || 0,
          },
          items: (payload?.items || []).map((item: any) => ({
            name: String(item?.name || 'Friend'),
            joinedAt: String(item?.joinedAt || new Date().toISOString()),
            reward: Number(item?.reward) || 0,
            status: REFERRAL_DISPLAY_STATUS[String(item?.status)] ?? 'pending',
          })),
        };
      },
      () => mockRequest('referrals.summary', localReferralSummary),
    );
  },

  /** Resolve a code from an invite link before the recipient has an account. */
  async lookup(code: string): Promise<{code: string; inviterName: string; welcomeBonus: number}> {
    const normalized = code.trim().toUpperCase();
    return viaRewards(
      async () => {
        const payload = backendBody(
          await backendGet<any>(`${REWARDS_BASE}/referrals/code/${encodeURIComponent(normalized)}`),
        );
        return {
          code: String(payload?.code || normalized),
          inviterName: String(payload?.inviterName || 'A friend'),
          welcomeBonus: Number(payload?.welcomeBonus) || rewardsConfig.referral.refereeWelcome,
        };
      },
      () =>
        mockRequest('referrals.lookup', () => {
          if (normalized !== db.earnSummary.referralCode.toUpperCase()) {
            throw new ApiError('That invite code is not valid.', 'not_found');
          }
          return {
            code: normalized,
            inviterName: 'A friend',
            welcomeBonus: rewardsConfig.referral.refereeWelcome,
          };
        }),
    );
  },

  async redeem(code: string, source?: string): Promise<{welcomeBonus: number; balance: number}> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      throw new ApiError('Enter an invite code.', 'validation');
    }
    return viaRewards(
      async () => {
        const payload = backendBody(
          await backendPost<any>(`${REWARDS_BASE}/referrals/redeem`, {code: normalized, source}),
        );
        return {
          welcomeBonus: Number(payload?.welcomeBonus) || 0,
          balance: Number(payload?.balance) || 0,
        };
      },
      () =>
        mockRequest('referrals.redeem', () => {
          if (normalized === db.earnSummary.referralCode.toUpperCase()) {
            throw new ApiError('You cannot use your own invite code.', 'validation');
          }
          const bonus = rewardsConfig.referral.refereeWelcome;
          db.earnSummary.balance += bonus;
          db.rewardHistory.unshift({
            id: db.nextId('r'),
            activity: 'Welcome bonus',
            amount: bonus,
            unit: 'IndexxPoints',
            status: 'completed',
            createdAt: new Date().toISOString(),
          });
          return {welcomeBonus: bonus, balance: db.earnSummary.balance};
        }),
    );
  },
};

// ---------------------------------------------------------------------------
// Wallet
//
// IndexxPoints are authoritative here; crypto rows are read from the Indexx wallet
// service and arrive flagged `preview`, meaning the balance is real but YaysApp
// cannot move it yet. Screens must keep send/convert disabled for those.
// ---------------------------------------------------------------------------

const backendWalletAsset = (raw: any): WalletAsset => ({
  symbol: String(raw?.symbol || '—'),
  name: String(raw?.name || raw?.symbol || 'Asset'),
  balance: Number(raw?.balance) || 0,
  fiatValue: Number(raw?.fiatValue) || 0,
  preview: raw?.preview !== false,
});

const WALLET_TX_STATUS: Record<string, WalletTransaction['status']> = {
  completed: 'preview',
  pending: 'preview',
  failed: 'preview',
};

const backendWalletTransaction = (raw: any): WalletTransaction => ({
  id: String(raw?.id || db.nextId('tx')),
  type: (['send', 'receive', 'reward', 'conversion'].includes(String(raw?.type))
    ? raw.type
    : 'reward') as WalletTransaction['type'],
  asset: String(raw?.asset || '—'),
  amount: Number(raw?.amount) || 0,
  counterparty: String(raw?.counterparty || '—'),
  createdAt: String(raw?.createdAt || new Date().toISOString()),
  status: WALLET_TX_STATUS[String(raw?.status)] ?? 'preview',
  memo: raw?.memo || undefined,
});

export const walletService = {
  async assets(): Promise<WalletAsset[]> {
    return viaRewards(
      async () => {
        const payload = backendBody(await backendGet<any>(`${REWARDS_BASE}/assets`));
        return (payload?.items || []).map(backendWalletAsset);
      },
      () => mockRequest('wallet.assets', () => db.walletAssets.map(a => ({...a}))),
    );
  },

  async transactions(): Promise<WalletTransaction[]> {
    return viaRewards(
      async () => {
        const payload = backendBody(
          await backendGet<any>(`${REWARDS_BASE}/transactions`, {limit: 50}),
        );
        return (payload?.items || []).map(backendWalletTransaction);
      },
      () => mockRequest('wallet.transactions', () => [...db.walletTransactions]),
    );
  },

  async transaction(id: string): Promise<WalletTransaction> {
    return viaRewards(
      async () =>
        backendWalletTransaction(
          backendBody(await backendGet<any>(`${REWARDS_BASE}/transactions/${id}`)),
        ),
      () =>
        mockRequest('wallet.transaction', () => {
          const t = db.walletTransactions.find(x => x.id === id);
          if (!t) {
            throw new ApiError('Transaction not found.', 'not_found');
          }
          return t;
        }),
    );
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

const ECOSYSTEM_BASE = '/api/v1/yays/ecosystem';

/** `null` = not yet probed. `false` = the deployment does not serve snapshots. */
let ecosystemBackendAvailable: boolean | null = BACKEND_ENABLED ? null : false;
let ecosystemProbe: Promise<boolean> | null = null;

/** Test hook — forgets the ecosystem probe. */
export const resetEcosystemBackendProbe = () => {
  ecosystemBackendAvailable = BACKEND_ENABLED ? null : false;
  ecosystemProbe = null;
  dataMode.set('ecosystem', false);
};

async function probeEcosystemBackend(): Promise<boolean> {
  if (ecosystemBackendAvailable !== null) {
    return ecosystemBackendAvailable;
  }
  if (ecosystemProbe) {
    return ecosystemProbe;
  }
  ecosystemProbe = (async () => {
    try {
      backendBody(await backendGet<any>(`${ECOSYSTEM_BASE}/config`));
      ecosystemBackendAvailable = true;
      dataMode.set('ecosystem', true);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'not_found') {
        ecosystemBackendAvailable = false;
        dataMode.set('ecosystem', false);
        return false;
      }
      return false;
    } finally {
      ecosystemProbe = null;
    }
  })();
  return ecosystemProbe;
}

async function viaEcosystem<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  return (await probeEcosystemBackend()) ? remote() : local();
}

const nullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** "2h 14m", or an em dash when the remaining time is unknown. */
const formatCountdown = (seconds: number | null): string => {
  if (seconds == null) {
    return '—';
  }
  if (seconds <= 0) {
    return 'now';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

/**
 * Map the backend's BTCY snapshot onto the dashboard shape.
 *
 * Editorial content — news items and the promo banner — has no backend source,
 * so it comes from the bundled catalogue rather than being fabricated per user.
 * Account figures never do: an unreadable one stays null and renders as "—".
 */
const backendBtcyDashboard = (raw: any): BtcyDashboard => ({
  mining: {
    active: Boolean(raw?.mining?.active),
    speed:
      raw?.mining?.speed == null ? '—' : `${Number(raw.mining.speed).toLocaleString('en-US')}×`,
    endsIn: formatCountdown(nullableNumber(raw?.mining?.endsInSeconds)),
  },
  portfolio: {
    nuggets: nullableNumber(raw?.portfolio?.nuggets),
    tokens: nullableNumber(raw?.portfolio?.tokens),
  },
  alchemy: {
    current: nullableNumber(raw?.alchemy?.currentUsd),
    target: nullableNumber(raw?.alchemy?.targetUsd),
  },
  referrals: {
    active: Number(raw?.referrals?.active) || 0,
    target: Number(raw?.referrals?.target) || 5,
  },
  station: {
    unlocked: Boolean(raw?.station?.unlocked),
    benefits: db.btcyDashboard.station.benefits,
  },
  watchEarn: {
    watched: nullableNumber(raw?.watchEarn?.watched),
    total: nullableNumber(raw?.watchEarn?.total),
    nuggetsToday: nullableNumber(raw?.watchEarn?.nuggetsToday),
  },
  news: db.btcyDashboard.news,
  promo: db.btcyDashboard.promo,
});

export const btcyService = {
  async dashboard(): Promise<BtcyDashboard> {
    return viaEcosystem(
      async () => backendBtcyDashboard(backendBody(await backendGet<any>(`${ECOSYSTEM_BASE}/btcy`))),
      () => mockRequest('btcy.dashboard', () => ({...db.btcyDashboard})),
    );
  },
};

/**
 * EMMM.
 *
 * This backend can only answer one thing about EMMM for certain: whether the
 * member's nuggets qualify them to play. Slate, jackpot, ticket, and accuracy
 * live inside the EMMM product and need its API — until that exists those
 * fields stay em dashes rather than being filled with believable numbers.
 */
const backendEmmmDashboard = (raw: any): EmmmDashboard => {
  const eligibility = raw?.eligibility;
  return {
    slate: {open: false, draw: '—', jackpot: '—', closesIn: '—'},
    portfolio: {
      value: '—',
      cash: '—',
      usdt: '—',
      nuggets:
        eligibility?.nuggetBalance == null
          ? '—'
          : Number(eligibility.nuggetBalance).toLocaleString('en-US'),
    },
    accuracy: {overall: '—', thisWeek: '—', brier: '—'},
    ticket: {title: '—', matched: 0, total: 0, tier: '—'},
    promo: eligibility?.eligible
      ? {
          headline: 'You qualify to play on EMMM',
          subtitle: `Up to ${Number(eligibility.maxBetNuggets || 0).toLocaleString('en-US')} nuggets per play.`,
        }
      : {
          headline: 'Keep mining to unlock EMMM',
          subtitle: String(eligibility?.reason || 'Mine BTCY nuggets to qualify.'),
        },
  };
};

export const emmmService = {
  async dashboard(): Promise<EmmmDashboard> {
    return viaEcosystem(
      async () => backendEmmmDashboard(backendBody(await backendGet<any>(`${ECOSYSTEM_BASE}/emmm`))),
      () => mockRequest('emmm.dashboard', () => ({...db.emmmDashboard})),
    );
  },
};

/**
 * ShoperPal.
 *
 * The buyer side reads real orders and the real nugget balance. Supplier state
 * (plan, listings, commission) has no source in this backend, so those figures
 * keep the catalogue's descriptive copy and carry no per-user numbers.
 */
const backendShoperpalDashboard = (raw: any): ShoperpalDashboard => {
  const base = db.shoperpalDashboard;
  const monthSpend = nullableNumber(raw?.buyer?.monthSpend);
  const nuggets = nullableNumber(raw?.buyer?.nuggetBalance);
  return {
    ...base,
    buyer: {
      ...base.buyer,
      monthSpend: monthSpend ?? 0,
      nuggets: {
        ...base.buyer.nuggets,
        wallet: nuggets ?? 0,
      },
    },
  };
};

export const shoperpalService = {
  async dashboard(): Promise<ShoperpalDashboard> {
    return viaEcosystem(
      async () =>
        backendShoperpalDashboard(
          backendBody(await backendGet<any>(`${ECOSYSTEM_BASE}/shoperpal`)),
        ),
      () => mockRequest('shoperpal.dashboard', () => ({...db.shoperpalDashboard})),
    );
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
// Notifications (Module 6)
// ---------------------------------------------------------------------------

const NOTIFICATIONS_BASE = '/api/v1/yays/notifications';
const TELEMETRY_BASE = '/api/v1/yays/telemetry';

/** `null` = not yet probed. `false` = the deployment does not serve M6 yet. */
let notificationsBackendAvailable: boolean | null = BACKEND_ENABLED ? null : false;
let notificationsProbe: Promise<boolean> | null = null;
let pushTransportLive = false;

/** Test hook — forgets the M6 probe. */
export const resetNotificationsBackendProbe = () => {
  notificationsBackendAvailable = BACKEND_ENABLED ? null : false;
  notificationsProbe = null;
  pushTransportLive = false;
};

/**
 * Resolve whether the deployment serves the M6 notification routes.
 *
 * Same rule as the AI probe: only a 404 marks the module absent. A network
 * blip leaves the answer unresolved so a later call retries instead of
 * stranding the session on mock notifications because the user was offline.
 */
async function probeNotificationsBackend(): Promise<boolean> {
  if (notificationsBackendAvailable !== null) {
    return notificationsBackendAvailable;
  }
  if (notificationsProbe) {
    return notificationsProbe;
  }
  notificationsProbe = (async () => {
    try {
      const payload = backendBody(await backendGet<any>(`${NOTIFICATIONS_BASE}/config`));
      pushTransportLive = Boolean(payload?.transport?.live);
      notificationsBackendAvailable = true;
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'not_found') {
        notificationsBackendAvailable = false;
        return false;
      }
      return false;
    } finally {
      notificationsProbe = null;
    }
  })();
  return notificationsProbe;
}

async function viaNotifications<T>(
  remote: () => Promise<T>,
  local: () => T | Promise<T>,
): Promise<T> {
  return (await probeNotificationsBackend()) ? remote() : local();
}

const NOTIFICATION_KINDS: Record<string, AppNotification['kind']> = {
  messages: 'chat',
  communities: 'community',
  rewards: 'reward',
  system: 'system',
};

const backendNotification = (raw: any): AppNotification => ({
  id: String(raw?.id || raw?._id || db.nextId('n')),
  title: String(raw?.title || 'Notification'),
  body: String(raw?.body || ''),
  createdAt: String(raw?.createdAt || new Date().toISOString()),
  read: Boolean(raw?.read),
  kind: NOTIFICATION_KINDS[String(raw?.category || 'system')] || 'system',
  deepLink: raw?.deepLink?.route
    ? {route: raw.deepLink.route, params: raw.deepLink.params || {}}
    : null,
});

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  communities: true,
  rewards: true,
  system: true,
  sounds: true,
  previewText: true,
  quietHours: {enabled: false, startMinute: 22 * 60, endMinute: 7 * 60, utcOffsetMinutes: 0},
  mutedConversationIds: [],
};

/** Local mirror used while the deployment does not serve M6 yet. */
let localPreferences: NotificationPreferences = {...DEFAULT_PREFERENCES};

const backendPreferences = (raw: any): NotificationPreferences => ({
  messages: raw?.messages !== false,
  communities: raw?.communities !== false,
  rewards: raw?.rewards !== false,
  system: raw?.system !== false,
  sounds: raw?.sounds !== false,
  previewText: raw?.previewText !== false,
  quietHours: {
    enabled: Boolean(raw?.quietHours?.enabled),
    startMinute: Number(raw?.quietHours?.startMinute ?? DEFAULT_PREFERENCES.quietHours.startMinute),
    endMinute: Number(raw?.quietHours?.endMinute ?? DEFAULT_PREFERENCES.quietHours.endMinute),
    utcOffsetMinutes: Number(raw?.quietHours?.utcOffsetMinutes ?? 0),
  },
  mutedConversationIds: Array.isArray(raw?.mutedConversationIds)
    ? raw.mutedConversationIds.map(String)
    : [],
});

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    return viaNotifications(
      async () => {
        const payload = backendBody(await backendGet<any>(`${NOTIFICATIONS_BASE}/inbox`));
        return (payload?.items || []).map(backendNotification);
      },
      () => mockRequest('notifications.list', () => [...db.notifications]),
    );
  },

  async unreadCount(): Promise<number> {
    return viaNotifications(
      async () => {
        const payload = backendBody(await backendGet<any>(`${NOTIFICATIONS_BASE}/inbox`, {limit: 1}));
        return Number(payload?.unread) || 0;
      },
      () => db.notifications.filter(n => !n.read).length,
    );
  },

  async markAllRead(): Promise<void> {
    await viaNotifications(
      async () => {
        await backendPost(`${NOTIFICATIONS_BASE}/inbox/read-all`);
      },
      () => {
        db.notifications.forEach(n => {
          n.read = true;
        });
      },
    );
  },

  async markRead(notificationId: string): Promise<void> {
    await viaNotifications(
      async () => {
        await backendPost(`${NOTIFICATIONS_BASE}/inbox/${notificationId}/read`);
      },
      () => {
        const row = db.notifications.find(n => n.id === notificationId);
        if (row) {
          row.read = true;
        }
      },
    );
  },

  // --- preferences ---------------------------------------------------------

  async preferences(): Promise<NotificationPreferences> {
    return viaNotifications(
      async () =>
        backendPreferences(backendBody(await backendGet<any>(`${NOTIFICATIONS_BASE}/preferences`))),
      () => ({...localPreferences}),
    );
  },

  async updatePreferences(
    patch: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    return viaNotifications(
      async () =>
        backendPreferences(
          backendBody(await backendPost<any>(`${NOTIFICATIONS_BASE}/preferences`, patch as any)),
        ),
      () => {
        localPreferences = {
          ...localPreferences,
          ...patch,
          quietHours: {...localPreferences.quietHours, ...(patch.quietHours || {})},
        };
        return {...localPreferences};
      },
    );
  },

  /** Mute or unmute one conversation's notifications. */
  async setConversationMuted(
    conversationId: string,
    muted: boolean,
  ): Promise<NotificationPreferences> {
    return viaNotifications(
      async () =>
        backendPreferences(
          backendBody(
            await backendPost<any>(`${NOTIFICATIONS_BASE}/mute`, {conversationId, muted}),
          ),
        ),
      () => {
        const set = new Set(localPreferences.mutedConversationIds);
        muted ? set.add(conversationId) : set.delete(conversationId);
        localPreferences = {...localPreferences, mutedConversationIds: Array.from(set)};
        return {...localPreferences};
      },
    );
  },

  // --- device registry -----------------------------------------------------

  async registerDevice(input: {
    deviceId: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    model?: string;
    osVersion?: string;
    appVersion?: string;
  }): Promise<void> {
    if (await probeNotificationsBackend()) {
      const payload = backendBody(await backendPost<any>(`${NOTIFICATIONS_BASE}/devices`, input));
      pushTransportLive = Boolean(payload?.transport?.live);
      return;
    }

    // The M6 routes are not deployed yet. Fall back to the shared Indexx
    // device registry so notifications keep working exactly as they do today —
    // without this, a fresh install registers its token nowhere and simply
    // stops receiving push until the M6 backend ships. The M6 endpoint clears
    // this same token when it does take over, so the handover is clean.
    const email = await backendSessionEmail();
    await backendPost('/api/v1/inex/user/saveDeviceToken', {
      email,
      token: input.token,
      type: input.platform,
      model: input.model || '',
      osVersion: input.osVersion || '',
      uniqueId: input.deviceId,
    });
  },

  async unregisterDevice(deviceId: string): Promise<void> {
    if (!(await probeNotificationsBackend())) {
      return;
    }
    await backendDelete(`${NOTIFICATIONS_BASE}/devices/${encodeURIComponent(deviceId)}`);
  },

  async devices(): Promise<PushDeviceInfo[]> {
    return viaNotifications(
      async () => {
        const rows = backendBody(await backendGet<any>(`${NOTIFICATIONS_BASE}/devices`));
        return (Array.isArray(rows) ? rows : []).map((row: any) => ({
          deviceId: String(row?.deviceId || ''),
          platform: (row?.platform as PushDeviceInfo['platform']) || 'ios',
          model: row?.model ?? null,
          appVersion: row?.appVersion ?? null,
          active: row?.active !== false,
          disabledReason: row?.disabledReason ?? null,
          lastSeenAt: row?.lastSeenAt ? String(row.lastSeenAt) : null,
        }));
      },
      () => [],
    );
  },

  /** Whether the server can actually deliver a push right now. */
  async transportLive(): Promise<boolean> {
    await probeNotificationsBackend();
    return pushTransportLive;
  },

  /**
   * Send this account a notification, to verify the chain end to end.
   *
   * Returns whether a device actually received a push. Where the deployment
   * does not serve M6 yet, the notification is still written to the local
   * inbox — so the tap-through path stays demonstrable and the caller's
   * "recorded, but no device was pushed" message is true rather than a
   * consolation.
   */
  async sendTestNotification(): Promise<boolean> {
    if (!(await probeNotificationsBackend())) {
      db.notifications.unshift({
        id: db.nextId('n'),
        title: 'YaysApp test notification',
        body: 'If you can read this, the notification path is wired up correctly.',
        createdAt: new Date().toISOString(),
        read: false,
        kind: 'system',
        deepLink: {route: 'notifications.inbox', params: {}},
      });
      return false;
    }
    const result = backendBody(await backendPost<any>(`${NOTIFICATIONS_BASE}/test`, {}));
    return Number(result?.delivered) > 0;
  },
};

// ---------------------------------------------------------------------------
// Telemetry transport (Module 6)
// ---------------------------------------------------------------------------

/**
 * Wires the client telemetry queue to the backend.
 *
 * Both calls throw on failure by design: the queue keeps the batch and retries
 * rather than dropping it. When the deployment does not serve M6 yet, the
 * probe short-circuits and events stay queued locally — capped, so a long-lived
 * install on an old backend cannot grow unbounded.
 */
export const telemetryTransport = {
  async sendEvents(batch: {
    events: unknown[];
    anonymousId: string;
    platform: string;
    appVersion?: string;
  }): Promise<void> {
    if (!(await probeNotificationsBackend())) {
      return;
    }
    await backendPost(`${TELEMETRY_BASE}/events`, batch as any);
  },

  async sendCrash(payload: {
    crash: unknown;
    anonymousId: string;
    platform: string;
    appVersion?: string;
  }): Promise<void> {
    if (!(await probeNotificationsBackend())) {
      return;
    }
    await backendPost(`${TELEMETRY_BASE}/crashes`, payload as any);
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
