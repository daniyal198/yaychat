/**
 * In-memory mock database seeded with realistic YaysApp data.
 * Mutated by the mock services so the app feels live within a session.
 */
import {
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
  PaymentMethod,
  RewardEntry,
  SettingsState,
  SocialAccount,
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
    msg('c_amara', 'u_amara', 'Daily check-in streak now gives bonus IndexxPoints on day 7 🎉', 250),
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
    msg('c_marco', 'u_marco', 'Mining explainer is live: https://www.bitcoinyay.com/mining', 126),
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
    msg('c_group_indexx', ME_ID, 'I asked aiainai to summarize it — sharing in a sec.', 395),
    msg('c_group_indexx', 'u_sana', 'This is why AI-in-chat is the best feature 😄', 390, {
      reactions: [{emoji: '💯', userIds: ['u_liu', 'u_priya']}],
    }),
    msg('c_group_indexx', 'u_tomas', 'Poll going up in the community later today.', 60),
  ],
  c_priya: [
    msg('c_priya', 'u_priya', 'Did your BTCY preview screen load for you?', 3000),
    msg('c_priya', ME_ID, 'Yes — remember it is preview only, no real transfers yet.', 2990),
    msg('c_priya', 'u_priya', 'Someone also sent this: https://example.com/yaysapp-offer', 2984),
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
    description: 'Early YaysApp crew exploring the Indexx ecosystem together.',
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
    verified: true,
    officialProduct: 'Bitcoin Yay',
    approvedPublisherIds: [ME_ID, 'u_sana'],
    joinRequests: [],
    moderationReports: [],
    bannedUserIds: [],
    rules: ['Be kind and constructive.', 'No financial advice.', 'No spam or self-promotion.', 'Use English in main channels.'],
    announcements: [
      {
        id: nextId('an'),
        title: 'AMA recap posted',
        body: 'The summary of last week’s AMA with the BTCY team is now pinned.',
        postedAt: hoursAgo(5),
        status: 'published',
        audience: 'members',
        actionLabel: 'Read recap',
        actionUrl: 'mock-link://btcy-ama-recap',
        readCount: 4820,
        publisherName: 'BTCY Official',
        publisherVerified: true,
        approvedBy: 'Sana Aziz',
      },
      {
        id: nextId('an'),
        title: 'Rewards roadmap livestream',
        body: 'Join the official BTCY team for a product roadmap livestream.',
        postedAt: hoursAgo(1),
        status: 'scheduled',
        scheduledFor: inDays(1),
        audience: 'region',
        region: 'United States',
        actionLabel: 'Set reminder',
        actionUrl: 'mock-link://btcy-roadmap-livestream',
        readCount: 0,
        publisherName: 'BTCY Official',
        publisherVerified: true,
        approvedBy: 'Sana Aziz',
      },
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
    joinRequests: [],
    moderationReports: [],
    bannedUserIds: [],
    rules: ['Critique the work, not the person.', 'Credit sources.'],
    announcements: [
      {
        id: nextId('an'),
        title: 'July design jam',
        body: 'Theme: chat interfaces that feel like home.',
        postedAt: daysAgo(1),
        status: 'published',
        audience: 'all',
        readCount: 612,
        publisherName: 'Amara Okafor',
      },
    ],
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
    joinRequested: true,
    joinRequests: [
      {
        id: nextId('jr'),
        userName: 'Jordan Reyes',
        userEmail: 'jordan@example.com',
        requestedAt: hoursAgo(2),
        status: 'pending',
      },
    ],
    moderationReports: [],
    bannedUserIds: [],
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
    joinRequests: [],
    moderationReports: [
      {
        id: nextId('rep'),
        targetType: 'post',
        targetId: 'fp_study_spam',
        reporterName: 'Priya Nair',
        reason: 'Spam',
        excerpt: 'Check out this deal, DM me for the link...',
        createdAt: minutesAgo(45),
        status: 'open',
      },
    ],
    bannedUserIds: [],
    rules: ['Stay on topic.', 'Share resources freely.'],
    announcements: [
      {
        id: nextId('an'),
        title: 'Exam season thread',
        body: 'Post your goals for the week.',
        postedAt: hoursAgo(30),
        status: 'published',
        audience: 'members',
        readCount: 1204,
        publisherName: 'Priya Nair',
      },
    ],
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
    joinRequests: [],
    moderationReports: [],
    bannedUserIds: [],
    rules: ['Invite only.'],
    announcements: [],
    events: [],
    polls: [],
    feed: [],
    inviteLink: 'https://yay.chat/c/founders-table',
  },
];

export const communityCategories = ['All', 'Crypto & Learning', 'Design', 'Markets', 'Learning', 'Business', 'Other'];

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

// AI catalogue, usage, consent, and history now live in
// services/ai/localEngine.ts, which mirrors the backend contract.

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
    {id: 'camp_1', title: 'Launch week double points', description: 'All chat activities earn 2× IndexxPoints during launch week.', endsAt: inDays(4), reward: '2× on chat activities'},
    {id: 'camp_2', title: 'Community builder', description: 'Create a community and reach 50 members.', endsAt: inDays(20), reward: '1,000 IndexxPoints'},
  ],
};

// The four core BTCY earn loops (Chat / Post / Shop / Use to Earn) lead the
// list, followed by supporting activities.
export const earnActivities: EarnActivity[] = [
  {id: 'act_chat', title: 'Chat to Earn', description: 'Send 10 messages to friends today.', reward: '+30', icon: 'chatbubbles', status: 'available', progress: {current: 6, target: 10}},
  {id: 'act_post', title: 'Post to Earn', description: 'Post in your communities and moments.', reward: '+15', icon: 'megaphone', status: 'completed_today'},
  {id: 'act_shop', title: 'Shop to Earn', description: 'Earn on ShoperPal purchases.', reward: 'Coming soon', icon: 'cart', status: 'coming_soon'},
  {id: 'act_use', title: 'Use to Earn', description: 'Use YaysApp and Indexx products — daily activity adds up.', reward: '+10', icon: 'apps', status: 'available', progress: {current: 2, target: 3}},
  {id: 'act_checkin', title: 'Daily check-in', description: 'Open YaysApp and check in once a day.', reward: '+20', icon: 'calendar', status: 'available'},
  {id: 'act_invite', title: 'Invite Friends to Earn', description: 'Earn for every friend who joins with your code.', reward: '+100', icon: 'person-add', status: 'available'},
  {id: 'act_ai', title: 'AI to Earn', description: 'Use any AI tool 3 times today.', reward: '+25', icon: 'sparkles', status: 'available', progress: {current: 1, target: 3}},
  {id: 'act_mine', title: 'Mine to Earn', description: 'BTCY mining rewards inside YaysApp.', reward: 'Coming soon', icon: 'hammer', status: 'coming_soon'},
  {id: 'act_ads', title: 'Watch Ads to Earn', description: 'Optional rewarded ads.', reward: 'Coming soon', icon: 'play-circle', status: 'coming_soon'},
];

export const rewardHistory: RewardEntry[] = [
  {id: nextId('r'), activity: 'Group to Earn', amount: 15, unit: 'IndexxPoints', status: 'completed', createdAt: hoursAgo(2)},
  {id: nextId('r'), activity: 'Daily check-in', amount: 20, unit: 'IndexxPoints', status: 'completed', createdAt: daysAgo(1)},
  {id: nextId('r'), activity: 'Invite Friends to Earn', amount: 100, unit: 'IndexxPoints', status: 'pending', createdAt: daysAgo(1), note: 'Waiting for Devon to verify their account.'},
  {id: nextId('r'), activity: 'Chat to Earn', amount: 30, unit: 'IndexxPoints', status: 'completed', createdAt: daysAgo(2)},
  {id: nextId('r'), activity: 'AI to Earn', amount: 25, unit: 'IndexxPoints', status: 'reversed', createdAt: daysAgo(4), note: 'Reversed: automated activity detected. Repeated abuse can restrict your account.'},
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
  // Brand colors and copy below mirror each product's live website.
  {id: 'p_btcy', name: 'BTCY', tagline: "Bitcoin's micro token", purpose: 'AI-powered mobile mining app for BTCY, the micro token of Bitcoin — mine free with Snatch Mining or boost with Power tiers.', benefit: 'Turn daily phone mining into BTCY over time.', earnAction: 'Mine to Earn', availability: 'preview', icon: 'logo-bitcoin', tileColor: '#ff8728', url: 'https://www.bitcoinyay.com/', ctaLabel: 'Start mining on BTCY'},
  {id: 'p_aiainai', name: 'aiainai', tagline: 'One Captain. A full AI team.', purpose: 'Agentic AI platform — give a task once and an AI Captain plans it and dispatches a team of specialized agents to research, analyze, create, and deliver.', benefit: 'Give the command; your AI team gets it done.', earnAction: 'AI to Earn', availability: 'available', icon: 'sparkles', tileColor: '#ff2d2d', url: 'https://aiainai.com/', ctaLabel: 'Open aiainai'},
  {id: 'p_shopper', name: 'ShoperPal', tagline: 'Shop direct from verified manufacturers', purpose: 'AI-powered marketplace for buying directly from KYB-verified manufacturers, with escrow-protected checkout and BTCY rewards on every purchase.', benefit: 'Earn BTCY rewards while you shop.', earnAction: 'Shop to Earn', availability: 'coming_soon', icon: 'cart', tileColor: '#4f46e5', url: 'http://test.shoperpal.com/', ctaLabel: 'Shop on ShoperPal'},
  {id: 'p_rehuman', name: 'ReHuman', tagline: 'Regenerative longevity', purpose: 'A regenerative longevity institution — a small, considered system of botanical and clinical formulas for energy, cardiopulmonary support, and structural renewal.', benefit: 'Clinically dosed, third-party tested formulas.', earnAction: 'Renew to Earn', availability: 'coming_soon', icon: 'leaf', tileColor: '#5c7062', url: 'https://rehumansystem.com/', ctaLabel: 'Explore ReHuman'},
  {id: 'p_emmm', name: 'EMMM', tagline: "The world's largest prediction market", purpose: 'Eeny Meeny Miny Moe — trade yes-or-no prediction markets on sports, politics, crypto, and world events, with a prediction lottery and leaderboards.', benefit: 'Back your predictions and earn on outcomes.', earnAction: 'Bet to Earn', availability: 'coming_soon', icon: 'ticket', tileColor: '#0d1321', url: 'https://emmm.io/', ctaLabel: 'Explore EMMM'},
  {id: 'p_exchange', name: 'Indexx Exchange', tagline: 'Crypto made simple', purpose: 'Beginner-friendly crypto exchange and ecosystem — buy and trade crypto, learn with courses, and invest in tokenized Wall Street assets.', benefit: 'Start your crypto journey with confidence.', earnAction: 'Order to Earn', availability: 'coming_soon', icon: 'stats-chart', tileColor: '#11be6a', url: 'https://indexx.ai/', ctaLabel: 'Trade on Indexx'},
  {id: 'p_treasury', name: 'Crypto Treasury', tagline: 'Long-term crypto holdings', purpose: 'The Indexx treasury layer — hold and grow crypto assets inside the ecosystem.', benefit: 'A safer home base for assets you are not actively trading.', earnAction: 'Hold to Earn', availability: 'coming_soon', icon: 'diamond', tileColor: '#c6942f', url: 'https://indexx.ai/', ctaLabel: 'Explore Crypto Treasury'},
  {id: 'p_lotto', name: 'Fantasy Lotto', tagline: 'Play the draw', purpose: 'Indexx Lotto — lottery-style draws and fantasy games inside the ecosystem.', benefit: 'Join draws with tokens and win prizes.', earnAction: 'Play to Earn', availability: 'coming_soon', icon: 'ticket', tileColor: '#7b5cb8', url: 'https://lotto.indexx.ai/', ctaLabel: 'Play Fantasy Lotto'},
  {id: 'p_wallstreet', name: 'Wallstreet', tagline: 'Tokenized stocks', purpose: 'Indexx Wallstreet — tokenized Wall Street assets you can hold and trade with crypto.', benefit: 'Stock exposure without leaving the ecosystem.', earnAction: 'Invest to Earn', availability: 'coming_soon', icon: 'briefcase', tileColor: '#23262f', url: 'https://indexx.ai/', ctaLabel: 'Explore Wallstreet'},
  {id: 'p_xtokens', name: 'xTokens', tagline: 'Ecosystem tokens', purpose: 'The Indexx token family — utility tokens that power products across the ecosystem.', benefit: 'One token family across every Indexx product.', earnAction: 'Swap to Earn', availability: 'coming_soon', icon: 'swap-horizontal', tileColor: '#3b6fe0', url: 'https://indexx.ai/', ctaLabel: 'Explore xTokens'},
  {id: 'p_academy', name: 'Academy', tagline: 'Learn crypto & AI', purpose: 'Indexx Academy — courses that take you from beginner to confident in crypto and AI.', benefit: 'Learn before you trade, at your own pace.', earnAction: 'Learn to Earn', availability: 'available', icon: 'school', tileColor: '#6d4ac2', url: 'https://academy.indexx.ai/', ctaLabel: 'Start learning'},
];

// Social platforms the user can link from the Explore home. Brand colors are
// each platform's official color. X renders with the legacy Twitter glyph
// because the bundled Ionicons set predates the X logo.
export const socialAccounts: SocialAccount[] = [
  {
    id: 's_whatsapp',
    name: 'WhatsApp',
    icon: 'logo-whatsapp',
    brandColor: '#25d366',
    blurb: 'Invite friends to YaysApp and share moments straight into WhatsApp chats.',
    unlocks: [
      'One-tap invites — friends get your referral link in a WhatsApp message.',
      'Share chats, moments, and product finds straight into WhatsApp.',
      'Earn IndexxPoints when an invited friend joins YaysApp.',
    ],
    connected: false,
  },
  {
    id: 's_facebook',
    name: 'Facebook',
    icon: 'logo-facebook',
    brandColor: '#1877f2',
    blurb: 'Share to your feed and find friends who already use YaysApp.',
    unlocks: [
      'Share moments and wins to your Facebook feed and Stories.',
      'Find Facebook friends who also use YaysApp.',
      'Verified name badge on your YaysApp profile.',
    ],
    connected: false,
  },
  {
    id: 's_instagram',
    name: 'Instagram',
    icon: 'logo-instagram',
    brandColor: '#e1306c',
    blurb: 'Share wins as Stories and show your handle on your profile.',
    unlocks: [
      'Share mining streaks and prediction wins as Instagram Stories.',
      'Verified @handle badge on your profile (creator and business accounts).',
    ],
    connected: false,
  },
  {
    id: 's_tiktok',
    name: 'TikTok',
    icon: 'logo-tiktok',
    brandColor: '#161823',
    blurb: 'Post your YaysApp clips to TikTok and show your creator badge.',
    unlocks: [
      'Post clips from YaysApp to TikTok in one tap.',
      'Creator badge with your follower count on your profile.',
      'Create-to-Earn rewards for shared content once rewards go live.',
    ],
    connected: false,
  },
  {
    id: 's_x',
    name: 'X',
    icon: 'logo-twitter',
    brandColor: '#0f1419',
    blurb: 'Share predictions and streaks to X and verify your handle.',
    unlocks: [
      'Share predictions, streaks, and wins as posts on X.',
      'Verified @handle badge on your YaysApp profile.',
    ],
    connected: false,
  },
  {
    id: 's_reddit',
    name: 'Reddit',
    icon: 'logo-reddit',
    brandColor: '#ff4500',
    blurb: 'Verify your username and share into your communities.',
    unlocks: [
      'Verified u/username badge on your YaysApp profile.',
      'Share predictions and finds straight to your subreddits.',
      'Quick access to the official YaysApp community on Reddit.',
    ],
    connected: false,
  },
  {
    id: 's_discord',
    name: 'Discord',
    icon: 'logo-discord',
    brandColor: '#5865f2',
    blurb: 'Show your Discord tag and join the YaysApp server.',
    unlocks: [
      'Your Discord tag on your YaysApp profile.',
      'One-tap invite to the official YaysApp Discord server.',
      'Community events and drops announced in Discord.',
    ],
    connected: false,
  },
  {
    id: 's_youtube',
    name: 'YouTube',
    icon: 'logo-youtube',
    brandColor: '#ff0000',
    blurb: 'Link your channel to your profile and play your videos inside YaysApp.',
    unlocks: [
      'Your channel linked on your YaysApp profile.',
      'Your videos play inline in chats and communities.',
      'Subscriber-count badge on your profile.',
    ],
    connected: false,
  },
];

// BTCY dashboard snapshot. In production this mirrors the user's Bitcoin Yay
// account; every CTA on the dashboard deep-links into the Bitcoin Yay app.
export const btcyDashboard: BtcyDashboard = {
  mining: {active: true, speed: '2.8 BTCY/hr', endsIn: '3h 12m'},
  portfolio: {nuggets: 8450, tokens: 145},
  alchemy: {current: 8450, target: 10000},
  referrals: {active: 18, target: 25},
  station: {
    unlocked: false,
    benefits: ['Sell Access', 'Premium Rewards', 'Higher Mining Benefits'],
  },
  watchEarn: {watched: 6, total: 10, nuggetsToday: 18},
  news: [
    {id: 'bn_1', tag: 'Update', title: 'Alchemy Reduced', detail: 'The Alchemy threshold drops from 50K to 10K nuggets — refining BTCY just got 5× faster.', hot: true},
    {id: 'bn_2', tag: 'New Feature', title: 'Dynamic Mining', detail: 'Mining speed now adapts to your daily activity across the Indexx ecosystem.'},
  ],
  promo: {headline: '15% OFF Power Mining', subtitle: 'Boost your rate with a discounted Power tier.', endsIn: '2 days'},
};

// EMMM dashboard snapshot — mirrors the user's emmm.io account; every CTA
// deep-links into the EMMM app. '—' marks values not yet wired to the API.
export const emmmDashboard: EmmmDashboard = {
  slate: {open: true, draw: 'Week 1 Lottery', jackpot: 'USDT 50,000.00', closesIn: '6d 23h'},
  portfolio: {value: '$—', cash: '$—', usdt: '$—', nuggets: '—'},
  accuracy: {overall: '—%', thisWeek: '—%', brier: '—'},
  ticket: {title: 'Week 1 Slate — Ticket #abc123', matched: 5, total: 7, tier: 'Match 5'},
  promo: {headline: 'Win real BTCY Tokens +20%', subtitle: '10% win boost + 7 days turbo mining'},
};

// ReHuman hub content — editorial snapshot of rehumansystem.com (a longevity
// supplement institution, not an account-based app). Formula accents are the
// site's own per-product colors. CTAs deep-link to the ReHuman site.
export const rehumanDashboard: RehumanDashboard = {
  tagline: 'Reverse · Renew · ReHuman',
  intro: 'A regenerative longevity institution — a small, considered system of botanical and clinical formulas for cellular vitality, resilience, and the long arc of human performance.',
  formulas: [
    {id: 'rh_lixir', code: 'F / 01', name: 'ReHuman Lixir', focus: 'Energy · Vitality · Daily Life', blurb: 'Sustained energy — for clearer mornings, fuller days, and a steadier sense of well-being. The formula to start with.', protocol: 'Two capsules each morning · 60 vegan capsules', accent: '#5c7491'},
    {id: 'rh_bio', code: 'F / 02', name: 'ReHuman Bio', focus: 'Heart · Lungs · Circulation', blurb: 'Cardiopulmonary support — for the rhythm of breath and the long work of the heart.', protocol: 'Daily protocol · third-party tested', accent: '#7a8b70'},
    {id: 'rh_optima', code: 'F / 03', name: 'ReHuman Optima', focus: 'Skin · Muscles · Bones', blurb: 'Structural renewal — for skin, lean muscle, and bone density. The load-bearing architecture of a longer life.', protocol: 'Daily protocol · clinical dosing', accent: '#c58d6e'},
  ],
  pillars: [
    {code: 'P / 01', name: 'Longevity', detail: 'Designing for the long arc — vitality measured in decades, not weeks.'},
    {code: 'P / 02', name: 'Regeneration', detail: "Supporting the body's own repair systems through botanical and cellular pathways."},
    {code: 'P / 03', name: 'Clinical Dosing', detail: 'Compounds at the dose where evidence begins — not where marketing ends.'},
    {code: 'P / 04', name: 'Alignment', detail: 'Calibrating biology, behavior, and environment to a coherent rhythm.'},
  ],
  systems: [
    {numeral: 'I', name: 'Cognition', sub: 'the mind', focus: 'Clarity · Focus · Recall'},
    {numeral: 'II', name: 'Respiration', sub: 'the breath', focus: 'Heart · Lungs · Circulation'},
    {numeral: 'III', name: 'Structure', sub: 'the frame', focus: 'Bone · Posture · Resilience'},
  ],
  stages: [
    {stage: 'Stage A', name: 'Wellness & Optimization', detail: 'Foundational formulas for vitality, resilience, recovery, and cognitive clarity.'},
    {stage: 'Stage B', name: 'Data & AI Personalization', detail: 'Biomarker analysis and adaptive recommendations — biological age tracking, wearables.'},
    {stage: 'Stage C', name: 'Regenerative Research', detail: 'An institute-grade research arm — observational studies and cellular rejuvenation work.'},
  ],
  journal: [
    {id: 'rh_n1', number: 'N° 01', title: 'The quiet rise of a longevity industry — and what it actually means.'},
    {id: 'rh_n2', number: 'N° 02', title: 'Why our system has three formulas, not thirty.'},
    {id: 'rh_n3', number: 'N° 03', title: "What your bloodwork can tell you that you can't feel."},
    {id: 'rh_n4', number: 'N° 04', title: 'Extending the middle of life, not the end of it.'},
  ],
  disclaimer: 'These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.',
};

// ShoperPal dashboard snapshot — buyer and supplier views; CTAs deep-link
// into the ShoperPal app.
export const shoperpalDashboard: ShoperpalDashboard = {
  buyer: {
    level: 'Silver',
    nextLevel: 'Gold',
    earnRate: '1.25 BTCY / $1',
    monthSpend: 245,
    nextLevelAt: 500,
    nuggets: {released: 1340, pending: 85, wallet: 1255, lifetime: 1425},
    flash: {title: 'Up to 40% off, ends today', endsIn: '04:12:36'},
  },
  supplier: {
    plan: 'Professional',
    productsListed: 142,
    productsLimit: 250,
    commission: '3% per sale',
    aiCredits: {used: 86, total: 200, resetsIn: '14 days'},
    earnings: {gross: '$—', fee: '$— (3%)', payout: '$—'},
    boosts: {active: 2, daysRemaining: 5},
  },
};

// Payment rails the user can link to the wallet, per the product must-haves:
// PayPal, Zelle, MetaMask, Indexx Pay, and Visa/Mastercard/Amex cards.
export const paymentMethods: PaymentMethod[] = [
  {
    id: 'pm_indexxpay',
    name: 'Indexx Pay',
    kind: 'wallet',
    icon: 'wallet',
    brandColor: '#11be6a',
    blurb: 'The house rail — pay with your Indexx balances across the whole ecosystem.',
    steps: [
      'Sign in with your Indexx account.',
      'Approve YaysApp’s request to use Indexx Pay.',
      'Your Indexx balances appear as a payment option.',
    ],
    unlocks: [
      'Pay in every Indexx product with one balance.',
      'Instant settlement for BTCY and xTokens.',
      'No card fees inside the ecosystem.',
    ],
    linked: false,
  },
  {
    id: 'pm_paypal',
    name: 'PayPal',
    kind: 'wallet',
    icon: 'logo-paypal',
    brandColor: '#003087',
    blurb: 'Check out with your PayPal balance or linked accounts.',
    steps: [
      'We open PayPal’s secure sign-in — your password stays with PayPal.',
      'You approve YaysApp in PayPal.',
      'PayPal shows up as a payment option at checkout.',
    ],
    unlocks: [
      'Pay with PayPal at checkout across YaysApp.',
      'Refunds go straight back to your PayPal.',
      'PayPal buyer protection on eligible purchases.',
    ],
    linked: false,
  },
  {
    id: 'pm_zelle',
    name: 'Zelle',
    kind: 'bank',
    icon: 'flash',
    brandColor: '#6d1ed4',
    blurb: 'Bank-to-bank transfers through your US bank’s Zelle enrollment.',
    steps: [
      'Enter the email or US mobile number enrolled with Zelle at your bank.',
      'We confirm it with a one-time code.',
      'Zelle becomes available for eligible transfers.',
    ],
    unlocks: [
      'Move money using your existing bank enrollment.',
      'No card numbers shared with YaysApp.',
    ],
    linked: false,
  },
  {
    id: 'pm_metamask',
    name: 'MetaMask',
    kind: 'crypto',
    icon: 'cube',
    brandColor: '#f6851b',
    blurb: 'Connect your self-custody wallet for crypto payments.',
    steps: [
      'We open MetaMask on your phone.',
      'You approve the connection request in MetaMask.',
      'Your wallet address is linked — keys never leave MetaMask.',
    ],
    unlocks: [
      'Pay and receive crypto from your own wallet.',
      'Use your MetaMask address across Indexx products.',
      'You approve every transaction in MetaMask.',
    ],
    linked: false,
  },
  {
    id: 'pm_card',
    name: 'Credit / debit card',
    kind: 'card',
    icon: 'card',
    brandColor: '#1a1f71',
    blurb: 'Visa, Mastercard, and American Express.',
    steps: [
      'Enter your card details — stored with our PCI-compliant processor, not YaysApp.',
      'Your bank verifies the card (3-D Secure).',
      'The card is saved for checkout.',
    ],
    unlocks: [
      'Pay by card anywhere in YaysApp.',
      'Visa, Mastercard, and Amex supported.',
      'Cards stay with the payment processor — never on our servers.',
    ],
    linked: false,
  },
];

/** Mock masked detail shown after linking a payment method. */
export const paymentMockDetail: Record<string, string> = {
  pm_indexxpay: 'Indexx account linked',
  pm_paypal: 'j•••@spocket.co',
  pm_zelle: '+1 ••• ••• 4821',
  pm_metamask: '0x74b1…9f3c',
  pm_card: 'Visa •••• 4242',
};

// ---------------------------------------------------------------------------
// Notifications / sessions / settings
// ---------------------------------------------------------------------------

// Deep links mirror what the M6 delivery service attaches to a real push, so
// tapping a row here exercises the same routing a notification tap does.
//
// These point at list routes rather than a specific conversation or community
// on purpose: this seed is sample data, but chat and communities run against
// the real backend, so a mock `c_amara` / `co_btcy` id would resolve to nothing
// and the screen would show an error. A real notification carries a real id
// from the server and opens the item itself.
export const notifications: AppNotification[] = [
  {id: nextId('n'), title: 'Amara Okafor', body: 'Got it, reviewing now 👀', createdAt: minutesAgo(12), read: false, kind: 'chat', deepLink: {route: 'chat.list', params: {}}},
  {id: nextId('n'), title: 'Daily check-in ready', body: 'Keep your 5-day streak alive!', createdAt: hoursAgo(1), read: false, kind: 'reward', deepLink: {route: 'rewards.home', params: {}}},
  {id: nextId('n'), title: 'BTCY Learners', body: 'New announcement: AMA recap posted', createdAt: hoursAgo(5), read: true, kind: 'community', deepLink: {route: 'community.list', params: {}}},
  {id: nextId('n'), title: 'Welcome to YaysApp', body: 'This is a preview build with simulated data.', createdAt: daysAgo(1), read: true, kind: 'system', deepLink: null},
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
