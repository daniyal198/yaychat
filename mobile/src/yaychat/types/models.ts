/** Yay-chat domain models used by the mock service layer and screens. */

export type ID = string;

export interface User {
  id: ID;
  name: string;
  username: string;
  email: string;
  phone?: string;
  bio?: string;
  online: boolean;
  lastSeen: string;
  isContact?: boolean;
  blocked?: boolean;
}

export interface Session {
  token: string;
  user: User;
  onboarded: boolean;
}

export type MessageKind =
  | 'text'
  | 'image'
  | 'video'
  | 'file'
  | 'voice'
  | 'sticker'
  | 'gif'
  | 'system';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  kind: MessageKind;
  text: string;
  createdAt: string;
  status: MessageStatus;
  replyToId?: ID;
  reactions: {emoji: string; userIds: ID[]}[];
  mentions?: ID[];
  pinned?: boolean;
  deleted?: boolean;
  recalled?: boolean;
  attachment?: {name: string; sizeLabel: string; durationLabel?: string};
  uploadProgress?: number;
}

export interface Conversation {
  id: ID;
  type: 'direct' | 'group';
  title: string;
  memberIds: ID[];
  lastMessage?: Message;
  unreadCount: number;
  muted: boolean;
  pinned: boolean;
  archived: boolean;
  typingUserIds: ID[];
  groupRoles?: Record<ID, 'owner' | 'admin' | 'member'>;
  description?: string;
}

export interface Community {
  id: ID;
  name: string;
  category: string;
  description: string;
  memberCount: number;
  privacy: 'public' | 'private';
  joined: boolean;
  joinRequested?: boolean;
  inviteOnly?: boolean;
  role?: 'admin' | 'moderator' | 'member';
  rules: string[];
  announcements: {id: ID; title: string; body: string; postedAt: string}[];
  events: {id: ID; title: string; date: string; attending: number}[];
  polls: {
    id: ID;
    question: string;
    options: {label: string; votes: number}[];
    votedIndex?: number;
    closesAt: string;
  }[];
  feed: {id: ID; authorName: string; body: string; postedAt: string; likes: number}[];
  inviteLink: string;
}

export interface AiMessage {
  id: ID;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface AiConversation {
  id: ID;
  title: string;
  tool: string;
  saved: boolean;
  updatedAt: string;
  messages: AiMessage[];
}

export interface AiUsage {
  usedCredits: number;
  totalCredits: number;
  plan: string;
}

export type RewardStatus = 'pending' | 'completed' | 'reversed';

export interface RewardEntry {
  id: ID;
  activity: string;
  amount: number;
  unit: 'YayPoints';
  status: RewardStatus;
  createdAt: string;
  note?: string;
}

export interface EarnActivity {
  id: ID;
  title: string;
  description: string;
  reward: string;
  icon: string;
  status: 'available' | 'completed_today' | 'coming_soon' | 'limit_reached';
  progress?: {current: number; target: number};
}

export interface EarnSummary {
  balance: number;
  streakDays: number;
  checkedInToday: boolean;
  dailyLimit: number;
  earnedToday: number;
  referralCode: string;
  referrals: {name: string; joinedAt: string; reward: number; status: RewardStatus}[];
  campaigns: {id: ID; title: string; description: string; endsAt: string; reward: string}[];
}

export interface WalletAsset {
  symbol: string;
  name: string;
  balance: number;
  fiatValue: number;
  preview: boolean;
}

export interface WalletTransaction {
  id: ID;
  type: 'send' | 'receive' | 'reward' | 'conversion';
  asset: string;
  amount: number;
  counterparty: string;
  createdAt: string;
  status: 'preview';
  memo?: string;
}

export interface EcosystemProduct {
  id: ID;
  name: string;
  tagline: string;
  purpose: string;
  benefit: string;
  earnAction: string;
  availability: 'available' | 'coming_soon' | 'preview';
  icon: string;
}

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: 'chat' | 'community' | 'reward' | 'system';
}

export interface DeviceSession {
  id: ID;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface SettingsState {
  notifications: {messages: boolean; communities: boolean; rewards: boolean; sounds: boolean};
  privacy: {lastSeen: boolean; readReceipts: boolean; discoverableByUsername: boolean};
  chat: {enterToSend: boolean; autoDownloadMedia: boolean; fontScale: 'small' | 'default' | 'large'};
  appearance: {theme: 'light' | 'system'};
  language: string;
  ai: {saveHistory: boolean; personalization: boolean};
  rewards: {activityTracking: boolean};
}

/** Paged result shape shared by list endpoints. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
