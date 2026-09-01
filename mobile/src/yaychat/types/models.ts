/** YaysApp domain models used by the mock service layer and screens. */

export type ID = string;

export interface User {
  id: ID;
  name: string;
  username: string;
  email: string;
  phone?: string;
  profilePic?: string;
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
  /** Database identifier used by backend-only operations such as read receipts. */
  backendId?: ID;
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
  attachment?: {
    name: string;
    sizeLabel: string;
    /** `0:14` — shown on voice and video bubbles. */
    durationLabel?: string;
    /** Remote URL, once uploaded. Absent for a send still in flight. */
    url?: string;
    /** Audio/video length in seconds, as stored on the message. */
    durationSeconds?: number;
    /** Local file URI, before upload — lets a voice note play back instantly. */
    localUri?: string;
  };
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
  /** URL handle used by the community's web link and invites. */
  slug?: string;
  name: string;
  category: string;
  description: string;
  memberCount: number;
  privacy: 'public' | 'private';
  joined: boolean;
  joinRequested?: boolean;
  inviteOnly?: boolean;
  role?: 'admin' | 'moderator' | 'member';
  verified?: boolean;
  officialProduct?: string;
  /** True when this account is banned — the screen shows the reason, not a Join button. */
  banned?: boolean;
  /** A private community seen by a non-member: cover fields only, no content. */
  restricted?: boolean;
  /** Server's answer to "may I post an official announcement here?". */
  canPublishAnnouncement?: boolean;
  canModerate?: boolean;
  /** M2 chat group backing community chat, so chat reuses the real transport. */
  chatGroupId?: string;
  approvedPublisherIds?: ID[];
  joinRequests?: {
    id: ID;
    userName: string;
    userEmail: string;
    requestedAt: string;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  moderationReports?: {
    id: ID;
    targetType: 'community' | 'post' | 'member' | 'announcement';
    targetId?: ID;
    reporterName: string;
    reason: string;
    excerpt: string;
    createdAt: string;
    status: 'open' | 'approved' | 'removed' | 'dismissed';
    assignedTo?: string;
  }[];
  bannedUserIds?: ID[];
  rules: string[];
  announcements: CommunityAnnouncement[];
  events: {
    id: ID;
    title: string;
    description?: string;
    date: string;
    location?: string;
    attending: number;
    /** True when this account has RSVP'd. */
    going?: boolean;
  }[];
  polls: {
    id: ID;
    question: string;
    options: {label: string; votes: number}[];
    votedIndex?: number;
    closesAt: string;
  }[];
  feed: {
    id: ID;
    authorName: string;
    authorId?: ID;
    body: string;
    postedAt: string;
    likes: number;
    liked?: boolean;
    mine?: boolean;
  }[];
  inviteLink: string;
  /** Verified-name collisions raised by the server at create/rename time. */
  impersonationFlags?: ImpersonationFlag[];
}

export interface CommunityAnnouncement {
  id: ID;
  title: string;
  body: string;
  postedAt: string;
  status?: 'pending_approval' | 'scheduled' | 'published' | 'rejected';
  scheduledFor?: string;
  audience?: 'all' | 'members' | 'region';
  region?: string;
  actionLabel?: string;
  actionUrl?: string;
  readCount?: number;
  /** How many members the send targeted — the denominator of the read rate. */
  deliveredCount?: number;
  /** True once this account has opened it; a re-read never re-counts. */
  readByMe?: boolean;
  publisherName?: string;
  publisherVerified?: boolean;
  approvedBy?: string;
  rejectedReason?: string;
}

/** One row on the members screen. */
export interface CommunityMember {
  id: ID;
  email: string;
  name: string;
  username: string;
  profilePic?: string;
  role?: 'admin' | 'moderator' | 'member';
  status: 'active' | 'banned' | 'left' | 'removed';
  joinedAt: string;
  banReason?: string;
}

/** A shareable invite link and the limits attached to it. */
export interface CommunityInvite {
  code: string;
  url: string;
  appUrl: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  revoked: boolean;
}

/** A suspected impersonation of a verified community. Advisory, never blocking. */
export interface ImpersonationFlag {
  matchedCommunityId: ID;
  matchedName: string;
  score: number;
  reason: 'exact' | 'normalized' | 'confusable' | 'official_term';
}

/** Read analytics for one announcement. */
export interface AnnouncementStats {
  announcementId: ID;
  status: string;
  audience: string;
  region?: string;
  delivered: number;
  reads: number;
  actioned: number;
  readRate: number;
  scheduledFor?: string;
  publishedAt?: string;
}

export interface AiMessage {
  id: ID;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  /** True when the answer came from the offline path during a provider outage. */
  degraded?: boolean;
}

export interface AiConversation {
  id: ID;
  title: string;
  tool: string;
  saved: boolean;
  updatedAt: string;
  messages: AiMessage[];
  /** Cumulative spend for this thread, shown on the history row. */
  costUsd?: number;
}

/** A tool tile on the AI hub. Mirrors the backend catalogue. */
export interface AiTool {
  id: string;
  title: string;
  /** Ionicons glyph. */
  icon: string;
  prompt: string;
  /** Needs the financial/legal/medical disclaimer banner. */
  disclaimer?: boolean;
  comingSoon?: boolean;
}

/** Today's usage and cost against the active plan. */
export interface AiUsage {
  usedRequests: number;
  totalRequests: number;
  plan: string;
  planLabel: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  costCapUsd: number;
  /** ISO timestamp of the next quota reset. */
  resetsAt: string;
}

/**
 * Privacy controls. The two `share*` switches are the explicit consent gate:
 * private chat and community content never reaches a model while they are off.
 */
export interface AiConsent {
  shareChatContent: boolean;
  shareCommunityContent: boolean;
  saveHistory: boolean;
  personalization: boolean;
  acceptedAt?: string | null;
}

/** Which provider is answering, so outages are visible rather than silent. */
export interface AiProviderStatus {
  id: string;
  model: string;
  /** False means answers come from the offline fallback. */
  live: boolean;
}

/** One-shot assist result used by the in-chat and in-community actions. */
export interface AiAssistResult {
  text: string;
  degraded: boolean;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
}

export type SupportTicketStatus =
  | 'ai_handling'
  | 'awaiting_user'
  | 'escalated'
  | 'resolved';

export interface SupportTicketMessage {
  id: ID;
  author: 'user' | 'ai' | 'agent';
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: ID;
  subject: string;
  product: string;
  status: SupportTicketStatus;
  messages: SupportTicketMessage[];
  escalatedAt?: string | null;
  updatedAt: string;
}

export type RewardStatus = 'pending' | 'completed' | 'reversed';

export interface RewardEntry {
  id: ID;
  activity: string;
  amount: number;
  unit: 'IndexxPoints';
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
 *
 * `null` on a numeric field means the value could not be read from the owning
 * product, and the screen renders an em dash. It is deliberately distinct from
 * `0`: "we don't know your nugget balance" and "your balance is zero" lead a
 * user to do completely different things.
 */
export interface BtcyDashboard {
  mining: {active: boolean; speed: string; endsIn: string};
  portfolio: {nuggets: number | null; tokens: number | null};
  alchemy: {current: number | null; target: number | null};
  referrals: {active: number; target: number};
  station: {unlocked: boolean; benefits: string[]};
  watchEarn: {watched: number | null; total: number | null; nuggetsToday: number | null};
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
    earnRate: string;
    monthSpend: number;
    orderCount: number;
    nuggets: {released: number; pending: number; wallet: number; lifetime: number};
    flash: {title: string; endsIn: string};
  };
  supplier: {
    plan: string;
    productsListed: number;
    productsLimit: number | string;
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

/** Notification destinations the app knows how to open (mirrors the server's registry). */
export type DeepLinkRoute =
  | 'chat.conversation'
  | 'chat.list'
  | 'community.list'
  | 'community.detail'
  | 'community.chat'
  | 'rewards.home'
  | 'notifications.inbox'
  | 'support.ticket';

export interface DeepLinkTarget {
  route: DeepLinkRoute;
  params: Record<string, string>;
}

export interface AppNotification {
  id: ID;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  kind: 'chat' | 'community' | 'reward' | 'system';
  /** Where tapping this notification goes. Null for informational rows. */
  deepLink?: DeepLinkTarget | null;
}

/** Quiet hours in the user's local time; `start > end` wraps past midnight. */
export interface QuietHours {
  enabled: boolean;
  startMinute: number;
  endMinute: number;
  utcOffsetMinutes: number;
}

/** Server-owned notification preferences (M6). Replaces `SettingsState.notifications`. */
export interface NotificationPreferences {
  messages: boolean;
  communities: boolean;
  rewards: boolean;
  system: boolean;
  sounds: boolean;
  /** Show the message text on the lock screen. */
  previewText: boolean;
  quietHours: QuietHours;
  mutedConversationIds: string[];
}

/** One install registered for push. */
export interface PushDeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  model: string | null;
  appVersion: string | null;
  active: boolean;
  disabledReason: string | null;
  lastSeenAt: string | null;
}

/** Whether push actually reaches a device, and why not when it does not. */
export interface PushStatus {
  /** OS-level permission. */
  permission: 'granted' | 'denied' | 'undetermined';
  /** A token is registered with the backend for this install. */
  registered: boolean;
  /** The server has a live push transport configured. */
  transportLive: boolean;
  note: string;
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
