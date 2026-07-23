/**
 * In-memory mock database seeded with realistic Yay-chat data.
 * Mutated by the mock services so the app feels live within a session.
 */
import {
  AiConversation,
  AiUsage,
  AppNotification,
  Community,
  Conversation,
  DeviceSession,
  EarnActivity,
  EarnSummary,
  EcosystemProduct,
  Message,
  RewardEntry,
  SettingsState,
  User,
} from '../../types/models';

export const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
export const hoursAgo = (h: number) => minutesAgo(h * 60);
export const daysAgo = (d: number) => hoursAgo(d * 24);
export const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

let idCounter = 1000;
export const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const ME_ID = 'u_me';

export const users: User[] = [
  {
    id: ME_ID,
    name: 'Jordan Reyes',
    username: 'jordan',
    email: 'jordan@example.com',
    phone: '+1 415 555 0117',
    bio: 'Exploring the Indexx ecosystem, one chat at a time.',
    online: true,
    lastSeen: minutesAgo(0),
  },
  {id: 'u_amara', name: 'Amara Okafor', username: 'amara', email: 'amara@example.com', bio: 'Designer. Coffee first.', online: true, lastSeen: minutesAgo(1), isContact: true},
  {id: 'u_liu', name: 'Liu Wen', username: 'liuwen', email: 'liu@example.com', bio: 'Building things.', online: false, lastSeen: minutesAgo(24), isContact: true},
  {id: 'u_marco', name: 'Marco Silva', username: 'marcos', email: 'marco@example.com', bio: 'BTCY enthusiast.', online: true, lastSeen: minutesAgo(3), isContact: true},
  {id: 'u_priya', name: 'Priya Nair', username: 'priya', email: 'priya@example.com', bio: 'Student, part-time trader.', online: false, lastSeen: hoursAgo(3), isContact: true},
  {id: 'u_tomas', name: 'Tomás Herrera', username: 'tomash', email: 'tomas@example.com', online: false, lastSeen: hoursAgo(9), isContact: true},
  {id: 'u_sana', name: 'Sana Aziz', username: 'sana', email: 'sana@example.com', bio: 'Community mod @ BTCY Learners.', online: true, lastSeen: minutesAgo(6), isContact: true},
  {id: 'u_dev', name: 'Devon Clarke', username: 'devonc', email: 'devon@example.com', online: false, lastSeen: daysAgo(2), isContact: false},
  {id: 'u_mia', name: 'Mia Tanaka', username: 'miat', email: 'mia@example.com', online: false, lastSeen: daysAgo(1), isContact: true},
];

export const userById = (id: string): User => users.find(u => u.id === id) ?? users[0];

// ---------------------------------------------------------------------------
// Conversations + messages
// ---------------------------------------------------------------------------

const msg = (
  conversationId: string,
  senderId: string,
  text: string,
  minsAgo: number,
  extra?: Partial<Message>,
): Message => ({
  id: nextId('m'),
  conversationId,
  senderId,
  kind: 'text',
  text,
  createdAt: minutesAgo(minsAgo),
  status: senderId === ME_ID ? 'read' : 'delivered',
  reactions: [],
  ...extra,
});

export const messages: Record<string, Message[]> = {
  c_amara: [
    msg('c_amara', 'u_amara', 'Morning! Did you see the new Earn challenges?', 260),
    msg('c_amara', ME_ID, 'Not yet — anything good?', 255),
    msg('c_amara', 'u_amara', 'Daily check-in streak now gives bonus YayPoints on day 7 🎉', 250),
    msg('c_amara', ME_ID, 'Nice, I am on day 5. Two more to go.', 245, {
      reactions: [{emoji: '🔥', userIds: ['u_amara']}],
    }),
    msg('c_amara', 'u_amara', 'Also sending you the design file for the community banner.', 40),
    msg('c_amara', 'u_amara', 'community-banner-v3.fig', 39, {
      kind: 'file',
      attachment: {name: 'community-banner-v3.fig', sizeLabel: '2.4 MB'},
    }),
    msg('c_amara', ME_ID, 'Got it, reviewing now 👀', 12),
  ],
  c_marco: [
    msg('c_marco', 'u_marco', 'Check this chart from the exchange preview', 130),
    msg('c_marco', 'u_marco', 'btcy-weekly.png', 129, {
      kind: 'image',
      attachment: {name: 'btcy-weekly.png', sizeLabel: '840 KB'},
    }),
    msg('c_marco', ME_ID, 'Interesting. Long-term I am more into the rewards side.', 100),
    msg('c_marco', 'u_marco', 'Fair. Voice note incoming', 95),
    msg('c_marco', 'u_marco', 'Voice note', 94, {
      kind: 'voice',
      attachment: {name: 'voice-note', sizeLabel: '112 KB', durationLabel: '0:42'},
    }),
  ],
  c_group_indexx: [
    msg('c_group_indexx', 'u_sana', 'Welcome @jordan to the crew! 👋', 2000, {mentions: ['u_me']}),
    msg('c_group_indexx', 'u_liu', 'Reminder: community call Thursday.', 900, {pinned: true}),
    msg('c_group_indexx', 'u_priya', 'Can someone summarize last week’s AMA?', 400),
    msg('c_group_indexx', ME_ID, 'I asked Yay AI to summarize it — sharing in a sec.', 395),
    msg('c_group_indexx', 'u_sana', 'This is why AI-in-chat is the best feature 😄', 390, {
      reactions: [{emoji: '💯', userIds: ['u_liu', 'u_priya']}],
    }),
    msg('c_group_indexx', 'u_tomas', 'Poll going up in the community later today.', 60),
  ],
  c_priya: [
    msg('c_priya', 'u_priya', 'Did your BTCY preview screen load for you?', 3000),
    msg('c_priya', ME_ID, 'Yes — remember it is preview only, no real transfers yet.', 2990),
  ],
  c_liu: [
    msg('c_liu', 'u_liu', 'Lunch tomorrow?', 1500),
    msg('c_liu', ME_ID, 'Yes! Noon at the usual place.', 1490, {status: 'delivered'}),
  ],
  c_group_design: [
    msg('c_group_design', 'u_amara', 'Dropping moodboards tonight.', 700),
    msg('c_group_design', 'u_mia', 'Excited to see the warm palette direction!', 650),
  ],
};

export const conversations: Conversation[] = [
  {
    id: 'c_amara',
    type: 'direct',
    title: 'Amara Okafor',
    memberIds: [ME_ID, 'u_amara'],
    unreadCount: 1,
    muted: false,
    pinned: true,
    archived: false,
    typingUserIds: [],
  },
  {
    id: 'c_group_indexx',
    type: 'group',
    title: 'Indexx Pioneers',
    memberIds: [ME_ID, 'u_sana', 'u_liu', 'u_priya', 'u_tomas', 'u_marco'],
    unreadCount: 3,
    muted: false,
    pinned: false,
    archived: false,
    typingUserIds: ['u_priya'],
    description: 'Early Yay-chat crew exploring the Indexx ecosystem together.',
    groupRoles: {
      u_sana: 'owner',
      u_liu: 'admin',
      [ME_ID]: 'member',
      u_priya: 'member',
      u_tomas: 'member',
      u_marco: 'member',
    },
  },
  {
    id: 'c_marco',
    type: 'direct',
    title: 'Marco Silva',
    memberIds: [ME_ID, 'u_marco'],
    unreadCount: 2,
    muted: false,
    pinned: false,
    archived: false,
    typingUserIds: [],
  },
  {
    id: 'c_liu',
    type: 'direct',
    title: 'Liu Wen',
    memberIds: [ME_ID, 'u_liu'],
    unreadCount: 0,
    muted: true,
    pinned: false,
    archived: false,
    typingUserIds: [],
  },
  {
    id: 'c_group_design',
    type: 'group',
    title: 'Design Lounge',
    memberIds: [ME_ID, 'u_amara', 'u_mia'],
    unreadCount: 0,
    muted: false,
    pinned: false,
    archived: false,
    typingUserIds: [],
    groupRoles: {u_amara: 'owner', [ME_ID]: 'member', u_mia: 'member'},
  },
  {
    id: 'c_priya',
    type: 'direct',
    title: 'Priya Nair',
    memberIds: [ME_ID, 'u_priya'],
    unreadCount: 0,
    muted: false,
    pinned: false,
    archived: true,
    typingUserIds: [],
  },
];

// ---------------------------------------------------------------------------
// Communities
// ---------------------------------------------------------------------------

export const communities: Community[] = [
  {
    id: 'co_btcy',
    name: 'BTCY Learners',
    category: 'Crypto & Learning',
    description: 'Learn how BTCY, nuggets, and the reward economy work — beginner friendly.',
    memberCount: 12480,
    privacy: 'public',
    joined: true,
    role: 'member',
    rules: ['Be kind and constructive.', 'No financial advice.', 'No spam or self-promotion.', 'Use English in main channels.'],
    announcements: [
      {id: nextId('an'), title: 'AMA recap posted', body: 'The summary of last week’s AMA with the BTCY team is now pinned.', postedAt: hoursAgo(5)},
      {id: nextId('an'), title: 'New moderators', body: 'Welcome Sana and Devon to the mod team!', postedAt: daysAgo(2)},
    ],
    events: [
      {id: nextId('ev'), title: 'Community call: Rewards roadmap', date: inDays(2), attending: 214},
      {id: nextId('ev'), title: 'Beginner Q&A night', date: inDays(6), attending: 98},
    ],
    polls: [
      {
        id: nextId('po'),
        question: 'Which Earn activity should we spotlight next week?',
        options: [
          {label: 'Chat to Earn', votes: 356},
          {label: 'Learn to Earn', votes: 512},
          {label: 'Invite Friends', votes: 204},
        ],
        closesAt: inDays(1),
      },
    ],
    feed: [
      {id: nextId('fp'), authorName: 'Sana Aziz', body: 'Weekly starter thread: what did you learn about the ecosystem this week?', postedAt: hoursAgo(3), likes: 42},
      {id: nextId('fp'), authorName: 'Marco Silva', body: 'PSA: wallet screens in the app are preview-only right now. Don’t fall for DMs claiming otherwise.', postedAt: hoursAgo(20), likes: 128},
    ],
    inviteLink: 'https://yay.chat/c/btcy-learners',
  },
  {
    id: 'co_design',
    name: 'Warm Interfaces',
    category: 'Design',
    description: 'A cozy corner for people who love warm, human product design.',
    memberCount: 3210,
    privacy: 'public',
    joined: false,
    rules: ['Critique the work, not the person.', 'Credit sources.'],
    announcements: [{id: nextId('an'), title: 'July design jam', body: 'Theme: chat interfaces that feel like home.', postedAt: daysAgo(1)}],
    events: [{id: nextId('ev'), title: 'Design jam kickoff', date: inDays(4), attending: 67}],
    polls: [],
    feed: [{id: nextId('fp'), authorName: 'Amara Okafor', body: 'Moodboard drop: sunrise palettes 🌅', postedAt: hoursAgo(8), likes: 77}],
    inviteLink: 'https://yay.chat/c/warm-interfaces',
  },
  {
    id: 'co_traders',
    name: 'Exchange Insiders',
    category: 'Markets',
    description: 'Private group for verified Indexx Exchange power users.',
    memberCount: 890,
    privacy: 'private',
    joined: false,
    rules: ['Verified members only.', 'No signals or pumping.'],
    announcements: [],
    events: [],
    polls: [],
    feed: [],
    inviteLink: 'https://yay.chat/c/exchange-insiders',
  },
  {
    id: 'co_students',
    name: 'Study Circle',
    category: 'Learning',
    description: 'Learn together with AI study tools and group accountability.',
    memberCount: 5642,
    privacy: 'public',
    joined: true,
    role: 'moderator',
    rules: ['Stay on topic.', 'Share resources freely.'],
    announcements: [{id: nextId('an'), title: 'Exam season thread', body: 'Post your goals for the week.', postedAt: hoursAgo(30)}],
    events: [{id: nextId('ev'), title: 'Pomodoro sprint', date: inDays(1), attending: 156}],
    polls: [],
    feed: [{id: nextId('fp'), authorName: 'Priya Nair', body: 'The AI summarizer saved me 2 hours on lecture notes today.', postedAt: hoursAgo(6), likes: 51}],
    inviteLink: 'https://yay.chat/c/study-circle',
  },
  {
    id: 'co_invite',
    name: 'Founders Table',
    category: 'Business',
    description: 'Invite-only space for ecosystem founders and builders.',
    memberCount: 120,
    privacy: 'private',
    joined: false,
    inviteOnly: true,
    rules: ['Invite only.'],
    announcements: [],
    events: [],
    polls: [],
    feed: [],
    inviteLink: 'https://yay.chat/c/founders-table',
  },
];

export const communityCategories = ['All', 'Crypto & Learning', 'Design', 'Markets', 'Learning', 'Business'];

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export const aiConversations: AiConversation[] = [
  {
    id: 'ai_1',
    title: 'AMA summary for Indexx Pioneers',
    tool: 'Summarize',
    saved: true,
    updatedAt: hoursAgo(4),
    messages: [
      {id: nextId('am'), role: 'user', text: 'Summarize the key points from the BTCY AMA transcript I pasted.', createdAt: hoursAgo(4)},
      {id: nextId('am'), role: 'assistant', text: 'Here are the key points:\n\n1. Rewards roadmap ships in phases, starting with daily check-ins.\n2. Nugget-to-BTCY conversion rules are still under review.\n3. Community moderators get new tools next quarter.\n\n(Simulated response — production AI arrives in Milestone 5.)', createdAt: hoursAgo(4)},
    ],
  },
  {
    id: 'ai_2',
    title: 'Email to landlord',
    tool: 'Write an email',
    saved: false,
    updatedAt: daysAgo(1),
    messages: [
      {id: nextId('am'), role: 'user', text: 'Write a polite email asking my landlord to fix the heater.', createdAt: daysAgo(1)},
      {id: nextId('am'), role: 'assistant', text: 'Subject: Heater repair request — Unit 4B\n\nHi Sam,\n\nI hope you are well. The heater in my unit has stopped working... (Simulated response.)', createdAt: daysAgo(1)},
    ],
  },
];

export const aiUsage: AiUsage = {usedCredits: 34, totalCredits: 100, plan: 'Preview plan'};

export const aiTools = [
  {id: 'ask', title: 'Ask a question', icon: 'help-circle', prompt: 'Ask me anything.'},
  {id: 'summarize', title: 'Summarize text', icon: 'reader', prompt: 'Paste text and I will summarize it.'},
  {id: 'summarize_pdf', title: 'Summarize PDF', icon: 'document-text', prompt: 'PDF support is coming soon.', comingSoon: true},
  {id: 'translate', title: 'Translate', icon: 'language', prompt: 'Tell me what to translate and into which language.'},
  {id: 'email', title: 'Write an email', icon: 'mail', prompt: 'Describe the email you need.'},
  {id: 'study', title: 'Study assistant', icon: 'school', prompt: 'What are you studying today?'},
  {id: 'code', title: 'Coding assistant', icon: 'code-slash', prompt: 'Share code or describe the bug.'},
  {id: 'finance', title: 'Financial assistant', icon: 'trending-up', prompt: 'General financial information only — never investment advice.', disclaimer: true},
  {id: 'image', title: 'Generate an image', icon: 'color-palette', prompt: 'Image generation is coming soon.', comingSoon: true},
];

export const suggestedPrompts = [
  'Summarize my unread group messages',
  'Translate "good morning" into Portuguese',
  'Help me plan a study schedule for finals',
  'Draft a friendly reminder email',
  'Explain BTCY nuggets like I am five',
];

// ---------------------------------------------------------------------------
// Earn
// ---------------------------------------------------------------------------

export const earnSummary: EarnSummary = {
  balance: 1240,
  streakDays: 5,
  checkedInToday: false,
  dailyLimit: 500,
  earnedToday: 130,
  referralCode: 'JORDAN-YAY',
  referrals: [
    {name: 'Mia Tanaka', joinedAt: daysAgo(3), reward: 100, status: 'completed'},
    {name: 'Devon Clarke', joinedAt: daysAgo(1), reward: 100, status: 'pending'},
  ],
  campaigns: [
    {id: 'camp_1', title: 'Launch week double points', description: 'All chat activities earn 2× YayPoints during launch week.', endsAt: inDays(4), reward: '2× on chat activities'},
    {id: 'camp_2', title: 'Community builder', description: 'Create a community and reach 50 members.', endsAt: inDays(20), reward: '1,000 YayPoints'},
  ],
};

export const earnActivities: EarnActivity[] = [
  {id: 'act_checkin', title: 'Daily check-in', description: 'Open Yay-chat and check in once a day.', reward: '+20', icon: 'calendar', status: 'available'},
  {id: 'act_chat', title: 'Chat to Earn', description: 'Send 10 messages to friends today.', reward: '+30', icon: 'chatbubbles', status: 'available', progress: {current: 6, target: 10}},
  {id: 'act_invite', title: 'Invite Friends to Earn', description: 'Earn for every friend who joins with your code.', reward: '+100', icon: 'person-add', status: 'available'},
  {id: 'act_ai', title: 'AI to Earn', description: 'Use any AI tool 3 times today.', reward: '+25', icon: 'sparkles', status: 'available', progress: {current: 1, target: 3}},
  {id: 'act_group', title: 'Group to Earn', description: 'Post in a community you belong to.', reward: '+15', icon: 'people', status: 'completed_today'},
  {id: 'act_shop', title: 'Shop to Earn', description: 'Earn on ShopperPal purchases.', reward: 'Coming soon', icon: 'cart', status: 'coming_soon'},
  {id: 'act_mine', title: 'Mine to Earn', description: 'BTCY mining rewards inside Yay-chat.', reward: 'Coming soon', icon: 'hammer', status: 'coming_soon'},
  {id: 'act_ads', title: 'Watch Ads to Earn', description: 'Optional rewarded ads.', reward: 'Coming soon', icon: 'play-circle', status: 'coming_soon'},
];

export const rewardHistory: RewardEntry[] = [
  {id: nextId('r'), activity: 'Group to Earn', amount: 15, unit: 'YayPoints', status: 'completed', createdAt: hoursAgo(2)},
  {id: nextId('r'), activity: 'Daily check-in', amount: 20, unit: 'YayPoints', status: 'completed', createdAt: daysAgo(1)},
  {id: nextId('r'), activity: 'Invite Friends to Earn', amount: 100, unit: 'YayPoints', status: 'pending', createdAt: daysAgo(1), note: 'Waiting for Devon to verify their account.'},
  {id: nextId('r'), activity: 'Chat to Earn', amount: 30, unit: 'YayPoints', status: 'completed', createdAt: daysAgo(2)},
  {id: nextId('r'), activity: 'AI to Earn', amount: 25, unit: 'YayPoints', status: 'reversed', createdAt: daysAgo(4), note: 'Reversed: automated activity detected. Repeated abuse can restrict your account.'},
];

// ---------------------------------------------------------------------------
// Wallet (preview only)
// ---------------------------------------------------------------------------

export const walletAssets = [
  {symbol: 'BTCY', name: 'Bitcoin Yay', balance: 1520.5, fiatValue: 152.05, preview: true},
  {symbol: 'NUG', name: 'Nuggets', balance: 340, fiatValue: 0, preview: true},
  {symbol: 'USDT', name: 'Tether', balance: 25, fiatValue: 25, preview: true},
  {symbol: 'BTC', name: 'Bitcoin', balance: 0.0012, fiatValue: 81.2, preview: true},
];

export const walletTransactions = [
  {id: nextId('tx'), type: 'reward' as const, asset: 'BTCY', amount: 12.5, counterparty: 'Earn Center', createdAt: hoursAgo(6), status: 'preview' as const, memo: 'Weekly activity reward'},
  {id: nextId('tx'), type: 'receive' as const, asset: 'BTCY', amount: 50, counterparty: 'Marco Silva', createdAt: daysAgo(2), status: 'preview' as const},
  {id: nextId('tx'), type: 'send' as const, asset: 'NUG', amount: 20, counterparty: 'Priya Nair', createdAt: daysAgo(3), status: 'preview' as const, memo: 'Thanks for the notes!'},
  {id: nextId('tx'), type: 'conversion' as const, asset: 'NUG → BTCY', amount: 100, counterparty: 'Conversion preview', createdAt: daysAgo(6), status: 'preview' as const},
];

// ---------------------------------------------------------------------------
// Ecosystem
// ---------------------------------------------------------------------------

export const ecosystemProducts: EcosystemProduct[] = [
  {id: 'p_btcy', name: 'BTCY', tagline: 'The reward economy', purpose: 'Mining, rewards, and the token that powers X-to-Earn.', benefit: 'Turn daily activity into BTCY over time.', earnAction: 'Mine to Earn', availability: 'preview', icon: 'logo-bitcoin'},
  {id: 'p_shopper', name: 'ShopperPal', tagline: 'Shop smarter', purpose: 'AI shopping companion with cashback across partner stores.', benefit: 'Earn while you shop.', earnAction: 'Shop to Earn', availability: 'coming_soon', icon: 'cart'},
  {id: 'p_rehuman', name: 'ReHuman', tagline: 'Prove you are you', purpose: 'Human verification for fair rewards and fair communities.', benefit: 'Unlock higher reward limits with verification.', earnAction: 'Verify to unlock', availability: 'coming_soon', icon: 'finger-print'},
  {id: 'p_emmm', name: 'EMMM', tagline: 'Events & entertainment', purpose: 'Prediction-style events and entertainment inside the ecosystem.', benefit: 'Join events with friends and communities.', earnAction: 'Predict to Earn', availability: 'coming_soon', icon: 'sparkles'},
  {id: 'p_exchange', name: 'Indexx Exchange', tagline: 'Trade with confidence', purpose: 'The exchange behind BTCY and supported assets.', benefit: 'Deeper markets when you are ready.', earnAction: 'Order to Earn', availability: 'coming_soon', icon: 'stats-chart'},
];

// ---------------------------------------------------------------------------
// Notifications / sessions / settings
// ---------------------------------------------------------------------------

export const notifications: AppNotification[] = [
  {id: nextId('n'), title: 'Amara Okafor', body: 'Got it, reviewing now 👀', createdAt: minutesAgo(12), read: false, kind: 'chat'},
  {id: nextId('n'), title: 'Daily check-in ready', body: 'Keep your 5-day streak alive!', createdAt: hoursAgo(1), read: false, kind: 'reward'},
  {id: nextId('n'), title: 'BTCY Learners', body: 'New announcement: AMA recap posted', createdAt: hoursAgo(5), read: true, kind: 'community'},
  {id: nextId('n'), title: 'Welcome to Yay-chat', body: 'This is a preview build with simulated data.', createdAt: daysAgo(1), read: true, kind: 'system'},
];

export const deviceSessions: DeviceSession[] = [
  {id: 'd_1', device: 'iPhone 16 Pro · this device', location: 'San Francisco, US', lastActive: minutesAgo(0), current: true},
  {id: 'd_2', device: 'iPad Air', location: 'San Francisco, US', lastActive: daysAgo(1), current: false},
  {id: 'd_3', device: 'Pixel 9', location: 'Austin, US', lastActive: daysAgo(12), current: false},
];

export const defaultSettings: SettingsState = {
  notifications: {messages: true, communities: true, rewards: true, sounds: true},
  privacy: {lastSeen: true, readReceipts: true, discoverableByUsername: true},
  chat: {enterToSend: false, autoDownloadMedia: true, fontScale: 'default'},
  appearance: {theme: 'light'},
  language: 'English',
  ai: {saveHistory: true, personalization: false},
  rewards: {activityTracking: true},
};

export let settings: SettingsState = JSON.parse(JSON.stringify(defaultSettings));

export const blockedUsers: string[] = ['u_dev'];
