/** Centralized route definitions. See docs/yaychat-navigation-map.md. */
import type {LinkingOptions, NavigatorScreenParams} from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  /** `phone` is carried through only when the signup supplied one, so the
   *  email step knows whether a phone step follows. */
  VerifyEmail: {email: string; phone?: string};
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

export type ExploreStackParamList = {
  ExploreHome: undefined;
  ProductDetail: {productId: string};
  SocialConnect: {socialId: string};
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
  /** Redeem an invite link; `code` is prefilled when the app was deep-linked. */
  JoinByInvite: {code?: string} | undefined;
};

export type AiStackParamList = {
  AiHome: undefined;
  AiChat: {conversationId?: string; toolId?: string; initialPrompt?: string};
  AiHistory: undefined;
  /** Support desk: AI first line with escalation to a human queue. */
  AiSupport: undefined;
  AiSupportThread: {ticketId: string};
};

export type EarnStackParamList = {
  EarnHome: undefined;
  RewardHistory: undefined;
  RewardDetail: {rewardId: string};
  /** `code` is pre-filled from an invite deep link (`invite/:code`). */
  Referral: {code?: string} | undefined;
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
  ExploreTab: NavigatorScreenParams<ExploreStackParamList>;
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
  PaymentMethods: undefined;
  PaymentMethodConnect: {methodId: string};
  TransactionDetail: {transactionId: string};
  SendPreview: undefined;
  ReceivePreview: undefined;
  Ecosystem: undefined;
  ProductPreview: {productId: string};
  BtcyHub: undefined;
  EmmmHub: undefined;
  ShoperpalHub: undefined;
  RehumanHub: undefined;
  /** Referral screen pushed at root level so flows like the BTCY dashboard keep their back stack. */
  InviteFriends: undefined;
  /**
   * Call screens sit at the root so a call can be answered from anywhere in the
   * app without unwinding the user's place in a tab stack.
   */
  IncomingCall: {callId?: string} | undefined;
  ActiveCall: undefined;
  CallHistory: undefined;
  ComingSoon: {title: string; message?: string};
};

/**
 * Deep-link config (Module 6).
 *
 * Mirrors the server's notification route registry
 * (`backend/services/notifications/deepLinks.ts`) so a link opens the same
 * screen whether it arrives as a push payload, a Universal Link, or a pasted
 * URL. Notification taps route imperatively through `navigation/navigationRef`
 * — this config covers links that enter through the OS.
 */
export const linkingConfig: LinkingOptions<RootStackParamList> = {
  prefixes: ['yaychat://', 'https://yay.chat'],
  // Two things this shape gets right, both of which fail silently otherwise:
  //
  //  - React Navigation reads the route table from `config.screens`. A
  //    top-level `screens` key is ignored without error — the app opens, but on
  //    whatever tab it would have shown anyway, indistinguishable from a link
  //    that never arrived.
  //  - `initialRouteName` per nested stack is valid at runtime and is the
  //    documented way to give a deep link a back stack, but the PathConfig
  //    types lose the nested param list two levels down and narrow the field to
  //    `undefined`. Hence the one cast below — dropping the option instead
  //    would ship conversations with no way back to the list.
  config: {
    screens: {
      Main: {
        screens: {
          // `initialRouteName` is what puts the list *underneath* the screen a
          // link opens. Without it React Navigation builds the stack with only
          // the target in it, so a link into a conversation arrives with no
          // back button and no way back to the chat list.
          ChatsTab: {
            initialRouteName: 'ChatList',
            screens: {ChatList: 'chat', Conversation: 'chat/:conversationId'},
          },
          CommunitiesTab: {
            initialRouteName: 'CommunitiesHome',
            screens: {
              CommunitiesHome: 'c',
              CommunityDetail: 'c/:communityId',
              CommunityChat: 'c/:communityId/chat',
            },
          },
          AiTab: {
            initialRouteName: 'AiHome',
            screens: {AiSupportThread: 'support/:ticketId'},
          },
          EarnTab: {
            initialRouteName: 'EarnHome',
            screens: {EarnHome: 'earn', Referral: 'invite/:code?'},
          },
          ProfileTab: {
            initialRouteName: 'ProfileHome',
            screens: {Notifications: 'notifications'},
          },
        },
      },
    },
  } as LinkingOptions<RootStackParamList>['config'],
};
