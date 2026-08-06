/** YaysApp domain models used by the mock service layer and screens. */

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
  /** Caller-generated idempotency key used to reconcile retries and optimistic sends. */
  clientId?: ID;
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
  /** True when the sender edited the message after sending. */
  edited?: boolean;
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
  /** Group topic category picked at creation (groups only). */
  category?: string;
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
  /** Solid tile color for the Explore grid. */
  tileColor: string;
  /** External product website opened by the detail-page CTA. */
  url: string;
  /** Detail-page primary button label, e.g. "Start mining on BTCY". */
  ctaLabel: string;
}

/** A social platform the user can link to their YaysApp account. */
export interface SocialAccount {
  id: ID;
  name: string;
  /** Ionicons logo glyph, e.g. "logo-instagram". */
  icon: string;
  /** The platform's brand color, used for the connect chip. */
  brandColor: string;
  /** One-line summary of why to link this platform. */
  blurb: string;
  /** What linking unlocks — bulleted on the connect screen. */
  unlocks: string[];
  connected: boolean;
  /** The user's handle on the platform, set once connected. */
  handle?: string;
}

/**
 * Snapshot of the user's Bitcoin Yay state, shown on the BTCY dashboard.
 * All actions deep-link to the Bitcoin Yay app — YaysApp only displays state.
 */
export interface BtcyDashboard {
  mining: {active: boolean; speed: string; endsIn: string};
  portfolio: {nuggets: number; tokens: number};
  alchemy: {current: number; target: number};
  referrals: {active: number; target: number};
  station: {unlocked: boolean; benefits: string[]};
  watchEarn: {watched: number; total: number; nuggetsToday: number};
  news: {id: ID; tag: string; title: string; detail: string; hot?: boolean}[];
  promo: {headline: string; subtitle: string; endsIn: string};
}

/**
 * Snapshot of the user's EMMM (Eeny Meeny Miny Moe) state for the EMMM hub.
 * Values not yet wired to the EMMM account API are em-dash placeholders.
 */
export interface EmmmDashboard {
  slate: {open: boolean; draw: string; jackpot: string; closesIn: string};
  portfolio: {value: string; cash: string; usdt: string; nuggets: string};
  accuracy: {overall: string; thisWeek: string; brier: string};
  ticket: {title: string; matched: number; total: number; tier: string};
  promo: {headline: string; subtitle: string};
}

/** Content snapshot for the ReHuman hub (brand/editorial, not account state). */
export interface RehumanDashboard {
  tagline: string;
  intro: string;
  formulas: {
    id: ID;
    code: string;
    name: string;
    focus: string;
    blurb: string;
    protocol: string;
    accent: string;
  }[];
  pillars: {code: string; name: string; detail: string}[];
  systems: {numeral: string; name: string; sub: string; focus: string}[];
  stages: {stage: string; name: string; detail: string}[];
  journal: {id: ID; number: string; title: string}[];
  disclaimer: string;
}

/** Snapshot of the user's ShoperPal buyer + supplier state for the hub. */
export interface ShoperpalDashboard {
  buyer: {
    level: string;
    nextLevel: string;
    earnRate: string;
    monthSpend: number;
    nextLevelAt: number;
    nuggets: {released: number; pending: number; wallet: number; lifetime: number};
    flash: {title: string; endsIn: string};
  };
  supplier: {
    plan: string;
    productsListed: number;
    productsLimit: number;
    commission: string;
    aiCredits: {used: number; total: number; resetsIn: string};
    earnings: {gross: string; fee: string; payout: string};
    boosts: {active: number; daysRemaining: number};
  };
}

/** A payment rail the user can link to the wallet. */
export interface PaymentMethod {
  id: ID;
  name: string;
  kind: 'wallet' | 'bank' | 'card' | 'crypto';
  /** Ionicons glyph for the method chip. */
  icon: string;
  brandColor: string;
  /** One-line summary of what this rail is for. */
  blurb: string;
  /** How linking works, step by step — shown on the connect screen. */
  steps: string[];
  /** What linking unlocks — bulleted on the connect screen. */
  unlocks: string[];
  linked: boolean;
  /** Masked account label once linked, e.g. "•••• 4242". */
  detail?: string;
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
