/** Centralized route definitions. See docs/yaychat-navigation-map.md. */
import type {NavigatorScreenParams} from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  VerifyEmail: {email: string};
  VerifyPhone: {phone: string};
  ForgotPassword: undefined;
  ResetPassword: {email: string};
  Legal: {doc: 'terms' | 'privacy'};
};

export type OnboardingStackParamList = {
  Username: undefined;
  ProfileSetup: {username: string};
  Permissions: undefined;
  OnboardingDone: undefined;
};

export type ChatsStackParamList = {
  ChatList: undefined;
  ChatSearch: undefined;
  ArchivedChats: undefined;
  NewChat: {group?: boolean} | undefined;
  Conversation: {conversationId: string};
  ConversationDetails: {conversationId: string};
  GroupMembers: {conversationId: string};
  SharedMedia: {conversationId: string};
  ForwardMessage: {conversationId: string; messageId: string};
  ContactProfile: {userId: string};
};

export type CommunitiesStackParamList = {
  CommunitiesHome: undefined;
  CommunitySearch: undefined;
  CommunityDetail: {communityId: string};
  CommunityChat: {communityId: string};
  CommunityMembers: {communityId: string};
  CreateCommunity: undefined;
  EditCommunity: {communityId: string};
};

export type AiStackParamList = {
  AiHome: undefined;
  AiChat: {conversationId?: string; toolId?: string; initialPrompt?: string};
  AiHistory: undefined;
};

export type EarnStackParamList = {
  EarnHome: undefined;
  RewardHistory: undefined;
  RewardDetail: {rewardId: string};
  Referral: undefined;
  CampaignDetail: {campaignId: string};
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  QrProfile: undefined;
  Contacts: undefined;
  BlockedUsers: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  PrivacySettings: undefined;
  ChatSettings: undefined;
  CommunitySettings: undefined;
  AiSettings: undefined;
  RewardsSettings: undefined;
  Appearance: undefined;
  Language: undefined;
  Accessibility: undefined;
  DataStorage: undefined;
  Devices: undefined;
  Help: undefined;
  AboutLegal: {doc?: 'terms' | 'privacy'} | undefined;
  DeleteAccount: undefined;
  Developer: undefined;
};

export type MainTabParamList = {
  ChatsTab: NavigatorScreenParams<ChatsStackParamList>;
  CommunitiesTab: NavigatorScreenParams<CommunitiesStackParamList>;
  AiTab: NavigatorScreenParams<AiStackParamList>;
  EarnTab: NavigatorScreenParams<EarnStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

/**
 * Root stack. Wallet, BTCY, and ecosystem discovery are progressive-disclosure
 * modules reachable from Earn/Profile rather than main tabs.
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  WalletOverview: undefined;
  WalletTransactions: undefined;
  TransactionDetail: {transactionId: string};
  SendPreview: undefined;
  ReceivePreview: undefined;
  Ecosystem: undefined;
  ProductPreview: {productId: string};
  ComingSoon: {title: string; message?: string};
};

/** Deep-link config (documented; wired in Milestone 2). */
export const linkingConfig = {
  prefixes: ['yaychat://', 'https://yay.chat'],
  screens: {
    Main: {
      screens: {
        ChatsTab: {screens: {Conversation: 'chat/:conversationId'}},
        CommunitiesTab: {screens: {CommunityDetail: 'c/:communityId'}},
        EarnTab: {screens: {Referral: 'invite/:code?'}},
      },
    },
  },
};
