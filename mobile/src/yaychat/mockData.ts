export type ThreadSummary = {
  id: string;
  title: string;
  handle: string;
  lastMessage: string;
  time: string;
  unread: number;
  accent: string;
  type: 'direct' | 'group' | 'service';
  state: string;
};

export type ContactSummary = {
  id: string;
  name: string;
  role: string;
  status: string;
  accent: string;
  action: string;
};

export type DiscoverCard = {
  id: string;
  title: string;
  description: string;
  badge: string;
  accent: string;
  route: string;
};

export type ServiceShortcut = {
  id: string;
  title: string;
  description: string;
  badge: string;
  route: string;
  accent: string;
};

export type MessagePreview = {
  id: string;
  author: string;
  body: string;
  time: string;
  direction: 'incoming' | 'outgoing' | 'system';
  status?: string;
};

export type CallPreview = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  mode: 'voice' | 'video';
  outcome: 'completed' | 'missed' | 'scheduled';
};

export type MomentPreview = {
  id: string;
  author: string;
  caption: string;
  meta: string;
  accent: string;
  stats: string;
};

export type MiniAppPreview = {
  id: string;
  title: string;
  description: string;
  accent: string;
};

export const chatThreads: ThreadSummary[] = [
  {
    id: '1',
    title: 'Ava Product',
    handle: '@ava',
    lastMessage: 'Pinned the revised launch copy and the new voice-note spec.',
    time: '09:12',
    unread: 3,
    accent: '#1d8f5f',
    type: 'direct',
    state: 'typing now',
  },
  {
    id: '2',
    title: 'Launch Crew',
    handle: '12 members',
    lastMessage: 'Design review moved to 3:30 PM. Bring wallet QR mocks.',
    time: '08:48',
    unread: 12,
    accent: '#ff7a45',
    type: 'group',
    state: 'live room ready',
  },
  {
    id: '3',
    title: 'Merchant Support',
    handle: '@yay-pay',
    lastMessage: 'Your sandbox merchant account has been approved.',
    time: 'Yesterday',
    unread: 0,
    accent: '#2f6ab8',
    type: 'service',
    state: 'official account',
  },
  {
    id: '4',
    title: 'Family Circle',
    handle: '6 members',
    lastMessage: 'Drop the grocery list in Moments so everyone can add to it.',
    time: 'Yesterday',
    unread: 1,
    accent: '#c6942f',
    type: 'group',
    state: 'quiet mode 10 PM',
  },
];

export const contactSummaries: ContactSummary[] = [
  {
    id: '1',
    name: 'Jordan Kim',
    role: 'Frequent contact',
    status: 'Available for voice and video',
    accent: '#1d8f5f',
    action: 'Message',
  },
  {
    id: '2',
    name: 'Nadia Sellers',
    role: 'Needs approval',
    status: 'Imported from invite link',
    accent: '#ff7a45',
    action: 'Approve',
  },
  {
    id: '3',
    name: 'Yay Merchant Hub',
    role: 'Official account',
    status: 'Orders, receipts, and service alerts',
    accent: '#2f6ab8',
    action: 'Follow',
  },
];

export const discoverCards: DiscoverCard[] = [
  {
    id: '1',
    title: 'Moments',
    description: 'Short posts, photo drops, and status updates from your circle.',
    badge: 'Social layer',
    accent: '#1d8f5f',
    route: 'MomentsPreview',
  },
  {
    id: '2',
    title: 'Scan & Pay',
    description: 'Contact QR, merchant QR, wallet transfer, and quick receipt flows.',
    badge: 'Wallet layer',
    accent: '#ff7a45',
    route: 'PayPreview',
  },
  {
    id: '3',
    title: 'Mini Apps',
    description: 'Lightweight services inside chat for booking, support, and commerce.',
    badge: 'Platform layer',
    accent: '#2f6ab8',
    route: 'MiniAppsPreview',
  },
];

export const serviceShortcuts: ServiceShortcut[] = [
  {
    id: '1',
    title: 'Mining Center',
    description: 'Preserved from the original app and moved under Services.',
    badge: 'Legacy module',
    route: 'Mining',
    accent: '#1d8f5f',
  },
  {
    id: '2',
    title: 'Subscription Plans',
    description: 'Existing premium and payment flows remain available here.',
    badge: 'Legacy module',
    route: 'Subscription',
    accent: '#ff7a45',
  },
  {
    id: '3',
    title: 'Support Portal',
    description: 'FAQ, contact, and issue routing from the original application.',
    badge: 'Operational',
    route: 'Support',
    accent: '#2f6ab8',
  },
  {
    id: '4',
    title: 'Referral & Whitepaper',
    description: 'Existing education and invite flows, kept reachable for continuity.',
    badge: 'Reference',
    route: 'WhitePaper',
    accent: '#c6942f',
  },
];

export const milestoneSignals = [
  {
    label: 'Current strength',
    value: 'Auth, wallet, support, basic chat',
  },
  {
    label: 'Next to match WeChat',
    value: 'Calls, media, social feed, payments',
  },
  {
    label: 'Delivery strategy',
    value: 'MVP chat first, super-app later',
  },
];

export const conversationPreview: MessagePreview[] = [
  {
    id: '1',
    author: 'Ava',
    body: 'Morning. I merged the chat card layout and left the call state hooks for you.',
    time: '09:10',
    direction: 'incoming',
  },
  {
    id: '2',
    author: 'You',
    body: 'Good. I am switching the shell from mining-first to YayChat-first now.',
    time: '09:11',
    direction: 'outgoing',
    status: 'Delivered',
  },
  {
    id: '3',
    author: 'Ava',
    body: 'We still need media, voice notes, and Socket.IO wiring to make this feel real.',
    time: '09:12',
    direction: 'incoming',
  },
  {
    id: '4',
    author: 'System',
    body: 'Launch Crew moved from preview to group-ready backlog.',
    time: '09:13',
    direction: 'system',
  },
  {
    id: '5',
    author: 'You',
    body: 'I will land the UI states first, then wire them to the backend event model.',
    time: '09:14',
    direction: 'outgoing',
    status: 'Read',
  },
];

export const callPreviews: CallPreview[] = [
  {
    id: '1',
    title: 'Launch Crew standup',
    subtitle: 'Group voice room',
    time: 'Today 3:30 PM',
    mode: 'voice',
    outcome: 'scheduled',
  },
  {
    id: '2',
    title: 'Jordan Kim',
    subtitle: 'Follow-up on wallet QR',
    time: 'Yesterday 6:12 PM',
    mode: 'video',
    outcome: 'completed',
  },
  {
    id: '3',
    title: 'Merchant Support',
    subtitle: 'Verification callback',
    time: 'Yesterday 10:05 AM',
    mode: 'voice',
    outcome: 'missed',
  },
];

export const momentsPreview: MomentPreview[] = [
  {
    id: '1',
    author: 'Yay Merchant Hub',
    caption: 'Early merchant sandbox is live. Scan-and-pay receipts are now included in the service backlog.',
    meta: 'Official account • 12m ago',
    accent: '#2f6ab8',
    stats: '42 likes • 9 comments',
  },
  {
    id: '2',
    author: 'Jordan Kim',
    caption: 'Posted new call UI references for quick review before dev handoff.',
    meta: 'Friend • 48m ago',
    accent: '#1d8f5f',
    stats: '18 likes • 4 comments',
  },
];

export const miniAppPreviews: MiniAppPreview[] = [
  {
    id: '1',
    title: 'Order Tracker',
    description: 'Merchant order updates inside chat.',
    accent: '#2f6ab8',
  },
  {
    id: '2',
    title: 'Travel Desk',
    description: 'Booking-like flow to show what service containers could become.',
    accent: '#ff7a45',
  },
  {
    id: '3',
    title: 'Support Bot',
    description: 'Official account plus service automation preview.',
    accent: '#1d8f5f',
  },
];
