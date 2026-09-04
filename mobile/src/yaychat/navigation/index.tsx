/** YaysApp navigation tree. See docs/yaychat-navigation-map.md. */
import React from 'react';
import {Image} from 'react-native';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, typography} from '../design/tokens';
import {formatUnreadBadge, useAuth, useUnread} from '../state/AppProviders';
import {SplashView, ComingSoonScreen} from '../screens/shared/SharedScreens';
import {
  AuthStackParamList,
  AiStackParamList,
  ChatsStackParamList,
  CommunitiesStackParamList,
  EarnStackParamList,
  ExploreStackParamList,
  MainTabParamList,
  OnboardingStackParamList,
  ProfileStackParamList,
  RootStackParamList,
  linkingConfig,
} from '../types/navigation';
import {flushPendingDeepLink, navigationRef} from './navigationRef';
import {analytics} from '../services';
import {ExploreHomeScreen, ProductDetailScreen, SocialConnectScreen} from '../screens/explore/ExploreScreens';
import {Wordmark} from '../design/components';
import {
  ForgotPasswordScreen,
  LegalScreen,
  OnboardingDoneScreen,
  PermissionsScreen,
  ProfileSetupScreen,
  ResetPasswordScreen,
  SignInScreen,
  SignUpScreen,
  UsernameScreen,
  VerifyEmailScreen,
  VerifyPhoneScreen,
  WelcomeScreen,
} from '../screens/auth/AuthScreens';
import {
  ArchivedChatsScreen,
  ChatListScreen,
  ChatSearchScreen,
  ContactProfileScreen,
  ConversationDetailsScreen,
  ConversationScreen,
  ForwardMessageScreen,
  GroupMembersScreen,
  NewChatScreen,
  SharedMediaScreen,
} from '../screens/chats/ChatScreens';
import {
  CommunitiesHomeScreen,
  CommunityChatScreen,
  CommunityDetailScreen,
  CommunityMembersScreen,
  CommunitySearchScreen,
  CreateCommunityScreen,
  EditCommunityScreen,
  JoinByInviteScreen,
} from '../screens/communities/CommunityScreens';
import {
  AiChatScreen,
  AiHistoryScreen,
  AiHomeScreen,
  AiSupportScreen,
  AiSupportThreadScreen,
} from '../screens/ai/AiScreens';
import {
  CampaignDetailScreen,
  EarnHomeScreen,
  InviteContactsScreen,
  ReferralScreen,
  RewardDetailScreen,
  RewardHistoryScreen,
} from '../screens/earn/EarnScreens';
import {
  PaymentMethodConnectScreen,
  PaymentMethodsScreen,
  ReceivePreviewScreen,
  SendPreviewScreen,
  TransactionDetailScreen,
  WalletOverviewScreen,
  WalletTransactionsScreen,
} from '../screens/wallet/WalletScreens';
import {EcosystemScreen, ProductPreviewScreen} from '../screens/ecosystem/EcosystemScreens';
import {
  ActiveCallScreen,
  CallHistoryScreen,
  IncomingCallScreen,
} from '../screens/calls/CallScreens';
import {BtcyHubScreen} from '../screens/btcy/BtcyScreens';
import {EmmmHubScreen} from '../screens/emmm/EmmmScreens';
import {ShoperpalHubScreen} from '../screens/shoperpal/ShoperpalScreens';
import {RehumanHubScreen} from '../screens/rehuman/RehumanScreens';
import {
  AboutLegalScreen,
  AccessibilityScreen,
  AiSettingsScreen,
  AppearanceScreen,
  BlockedUsersScreen,
  ChatSettingsScreen,
  CommunitySettingsScreen,
  ContactsScreen,
  DataStorageScreen,
  DeleteAccountScreen,
  DeveloperScreen,
  DevicesScreen,
  EditProfileScreen,
  HelpScreen,
  LanguageScreen,
  NotificationSettingsScreen,
  NotificationsScreen,
  PrivacySettingsScreen,
  ProfileHomeScreen,
  QrProfileScreen,
  RewardsSettingsScreen,
} from '../screens/profile/ProfileScreens';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.borderSoft,
    primary: colors.brand,
  },
};

const stackOptions = {
  headerShadowVisible: false,
  // Header titles keep their designed size regardless of OS "Larger Text".
  headerTitleAllowFontScaling: false,
  headerStyle: {backgroundColor: colors.background},
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    fontFamily: typography.titleFamily,
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.textPrimary,
  },
  headerBackButtonDisplayMode: 'minimal' as const,
  contentStyle: {backgroundColor: colors.background},
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={stackOptions}>
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{headerShown: false}} />
    <AuthStack.Screen name="SignIn" component={SignInScreen} options={{title: 'Sign in'}} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} options={{title: 'Create account'}} />
    <AuthStack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{title: 'Verify email'}} />
    <AuthStack.Screen name="VerifyPhone" component={VerifyPhoneScreen} options={{title: 'Verify phone'}} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{title: 'Forgot password'}} />
    <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{title: 'Reset password'}} />
    <AuthStack.Screen name="Legal" component={LegalScreen} options={{title: 'Legal', presentation: 'modal'}} />
  </AuthStack.Navigator>
);

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const OnboardingNavigator = () => (
  <OnboardingStack.Navigator screenOptions={stackOptions}>
    <OnboardingStack.Screen name="Username" component={UsernameScreen} options={{title: 'Pick a username'}} />
    <OnboardingStack.Screen name="ProfileSetup" component={ProfileSetupScreen} options={{title: 'Your profile'}} />
    <OnboardingStack.Screen name="Permissions" component={PermissionsScreen} options={{title: 'Stay in the loop'}} />
    <OnboardingStack.Screen name="OnboardingDone" component={OnboardingDoneScreen} options={{headerShown: false}} />
  </OnboardingStack.Navigator>
);

const ExploreStack = createNativeStackNavigator<ExploreStackParamList>();
const ExploreNavigator = () => (
  <ExploreStack.Navigator screenOptions={stackOptions}>
    <ExploreStack.Screen name="ExploreHome" component={ExploreHomeScreen} options={{headerShown: false}} />
    <ExploreStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{title: ''}} />
    <ExploreStack.Screen name="SocialConnect" component={SocialConnectScreen} options={{title: ''}} />
    {sharedUtilityScreens(ExploreStack)}
  </ExploreStack.Navigator>
);

const ChatsStack = createNativeStackNavigator<ChatsStackParamList>();
const ChatsNavigator = () => (
  <ChatsStack.Navigator screenOptions={stackOptions}>
    <ChatsStack.Screen
      name="ChatList"
      component={ChatListScreen}
      options={{headerTitle: () => <Wordmark height={34} />}}
    />
    <ChatsStack.Screen name="ChatSearch" component={ChatSearchScreen} options={{title: 'Search'}} />
    <ChatsStack.Screen name="ArchivedChats" component={ArchivedChatsScreen} options={{title: 'Archived'}} />
    <ChatsStack.Screen name="NewChat" component={NewChatScreen} options={{title: 'New chat', presentation: 'modal'}} />
    <ChatsStack.Screen name="Conversation" component={ConversationScreen} options={{title: ''}} />
    <ChatsStack.Screen name="ConversationDetails" component={ConversationDetailsScreen} options={{title: 'Details'}} />
    <ChatsStack.Screen name="GroupMembers" component={GroupMembersScreen} options={{title: 'Members'}} />
    <ChatsStack.Screen name="SharedMedia" component={SharedMediaScreen} options={{title: 'Shared media'}} />
    <ChatsStack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{title: 'Forward to', presentation: 'modal'}} />
    <ChatsStack.Screen name="ContactProfile" component={ContactProfileScreen} options={{title: 'Profile'}} />
    <ChatsStack.Screen name="InviteContacts" component={InviteContactsScreen} options={{title: 'Contacts'}} />
    {sharedUtilityScreens(ChatsStack)}
  </ChatsStack.Navigator>
);

const CommunitiesStack = createNativeStackNavigator<CommunitiesStackParamList>();
const CommunitiesNavigator = () => (
  <CommunitiesStack.Navigator screenOptions={stackOptions}>
    <CommunitiesStack.Screen name="CommunitiesHome" component={CommunitiesHomeScreen} options={{title: 'Communities'}} />
    <CommunitiesStack.Screen name="CommunitySearch" component={CommunitySearchScreen} options={{title: 'Find communities'}} />
    <CommunitiesStack.Screen name="CommunityDetail" component={CommunityDetailScreen} options={{title: ''}} />
    <CommunitiesStack.Screen name="CommunityChat" component={CommunityChatScreen} options={{title: 'Community chat'}} />
    <CommunitiesStack.Screen name="CommunityMembers" component={CommunityMembersScreen} options={{title: 'Members'}} />
    <CommunitiesStack.Screen name="CreateCommunity" component={CreateCommunityScreen} options={{title: 'Create community', presentation: 'modal'}} />
    <CommunitiesStack.Screen name="EditCommunity" component={EditCommunityScreen} options={{title: 'Edit community'}} />
    <CommunitiesStack.Screen name="JoinByInvite" component={JoinByInviteScreen} options={{title: 'Join with an invite', presentation: 'modal'}} />
    {sharedUtilityScreens(CommunitiesStack)}
  </CommunitiesStack.Navigator>
);

const AiStack = createNativeStackNavigator<AiStackParamList>();
const AiNavigator = () => (
  <AiStack.Navigator screenOptions={stackOptions}>
    <AiStack.Screen name="AiHome" component={AiHomeScreen} options={{title: 'aiainai'}} />
    <AiStack.Screen name="AiChat" component={AiChatScreen} options={{title: 'aiainai'}} />
    <AiStack.Screen name="AiHistory" component={AiHistoryScreen} options={{title: 'History'}} />
    <AiStack.Screen name="AiSupport" component={AiSupportScreen} options={{title: 'Support desk'}} />
    <AiStack.Screen
      name="AiSupportThread"
      component={AiSupportThreadScreen}
      options={{title: 'Support'}}
    />
    {sharedUtilityScreens(AiStack)}
  </AiStack.Navigator>
);

const EarnStack = createNativeStackNavigator<EarnStackParamList>();
const EarnNavigator = () => (
  <EarnStack.Navigator screenOptions={stackOptions}>
    <EarnStack.Screen name="EarnHome" component={EarnHomeScreen} options={{title: 'Earn'}} />
    <EarnStack.Screen name="RewardHistory" component={RewardHistoryScreen} options={{title: 'Reward history'}} />
    <EarnStack.Screen name="RewardDetail" component={RewardDetailScreen} options={{title: 'Reward'}} />
    <EarnStack.Screen name="Referral" component={ReferralScreen} options={{title: 'Invite friends'}} />
    <EarnStack.Screen name="InviteContacts" component={InviteContactsScreen} options={{title: 'Invite friends'}} />
    <EarnStack.Screen name="CampaignDetail" component={CampaignDetailScreen} options={{title: 'Campaign'}} />
    {sharedUtilityScreens(EarnStack)}
  </EarnStack.Navigator>
);

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={stackOptions}>
    <ProfileStack.Screen name="ProfileHome" component={ProfileHomeScreen} options={{title: 'Me'}} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{title: 'Edit profile'}} />
    <ProfileStack.Screen name="QrProfile" component={QrProfileScreen} options={{title: 'My QR'}} />
    <ProfileStack.Screen name="Contacts" component={ContactsScreen} options={{title: 'Friends'}} />
    <ProfileStack.Screen name="InviteContacts" component={InviteContactsScreen} options={{title: 'Invite friends'}} />
    <ProfileStack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{title: 'Blocked users'}} />
    <ProfileStack.Screen name="Notifications" component={NotificationsScreen} options={{title: 'Notifications'}} />
    <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{title: 'Notifications'}} />
    <ProfileStack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{title: 'Privacy'}} />
    <ProfileStack.Screen name="ChatSettings" component={ChatSettingsScreen} options={{title: 'Chat settings'}} />
    <ProfileStack.Screen name="CommunitySettings" component={CommunitySettingsScreen} options={{title: 'Community settings'}} />
    <ProfileStack.Screen name="AiSettings" component={AiSettingsScreen} options={{title: 'AI settings'}} />
    <ProfileStack.Screen name="RewardsSettings" component={RewardsSettingsScreen} options={{title: 'Rewards settings'}} />
    <ProfileStack.Screen name="Appearance" component={AppearanceScreen} options={{title: 'Appearance'}} />
    <ProfileStack.Screen name="Language" component={LanguageScreen} options={{title: 'Language'}} />
    <ProfileStack.Screen name="Accessibility" component={AccessibilityScreen} options={{title: 'Accessibility'}} />
    <ProfileStack.Screen name="DataStorage" component={DataStorageScreen} options={{title: 'Data and storage'}} />
    <ProfileStack.Screen name="Devices" component={DevicesScreen} options={{title: 'Devices'}} />
    <ProfileStack.Screen name="Help" component={HelpScreen} options={{title: 'Help center'}} />
    <ProfileStack.Screen name="AboutLegal" component={AboutLegalScreen} options={{title: 'About YaysApp'}} />
    <ProfileStack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{title: 'Delete account'}} />
    <ProfileStack.Screen name="Developer" component={DeveloperScreen} options={{title: 'Preview controls'}} />
    {sharedUtilityScreens(ProfileStack)}
  </ProfileStack.Navigator>
);

/**
 * Screens reachable from several tabs (wallet, payments, BTCY, ecosystem…).
 * Registered inside EVERY tab's stack — rather than on the root stack — so the
 * bottom tab bar stays visible on every page. Each tab resolves these route
 * names to its own copy, which also keeps the back stack within the tab.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sharedUtilityScreens = (Stack: any) => (
  <>
    <Stack.Screen name="WalletOverview" component={WalletOverviewScreen} options={{title: 'Wallet preview'}} />
    <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} options={{title: 'Activity'}} />
    <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{title: 'Transaction'}} />
    <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{title: 'Payment methods'}} />
    <Stack.Screen name="PaymentMethodConnect" component={PaymentMethodConnectScreen} options={{title: ''}} />
    <Stack.Screen name="SendPreview" component={SendPreviewScreen} options={{title: 'Send (preview)', presentation: 'modal'}} />
    <Stack.Screen name="ReceivePreview" component={ReceivePreviewScreen} options={{title: 'Receive (preview)', presentation: 'modal'}} />
    <Stack.Screen name="BtcyHub" component={BtcyHubScreen} options={{title: 'Bitcoin Yay'}} />
    <Stack.Screen name="EmmmHub" component={EmmmHubScreen} options={{title: 'EMMM'}} />
    <Stack.Screen name="ShoperpalHub" component={ShoperpalHubScreen} options={{title: 'ShoperPal'}} />
    <Stack.Screen name="RehumanHub" component={RehumanHubScreen} options={{title: 'ReHuman'}} />
    <Stack.Screen name="InviteFriends" component={ReferralScreen} options={{title: 'Invite friends'}} />
    <Stack.Screen name="Ecosystem" component={EcosystemScreen} options={{title: 'Indexx ecosystem'}} />
    <Stack.Screen name="ProductPreview" component={ProductPreviewScreen} options={{title: ''}} />
    <Stack.Screen name="CallHistory" component={CallHistoryScreen} options={{title: 'Calls'}} />
    {/* Full-screen and un-dismissable by a header back button: a ringing or
        live call owns the screen until it is answered, declined, or ended. */}
    <Stack.Screen
      name="IncomingCall"
      component={IncomingCallScreen}
      options={{headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false}}
    />
    <Stack.Screen
      name="ActiveCall"
      component={ActiveCallScreen}
      options={{headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false}}
    />
    <Stack.Screen name="ComingSoon" component={ComingSoonScreen} options={{title: ''}} />
  </>
);

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, [string, string]> = {
  ExploreTab: ['compass', 'compass-outline'],
  ChatsTab: ['chatbubbles', 'chatbubbles-outline'],
  CommunitiesTab: ['people', 'people-outline'],
  AiTab: ['sparkles', 'sparkles-outline'],
  EarnTab: ['gift', 'gift-outline'],
  ProfileTab: ['person-circle', 'person-circle-outline'],
};

// Brand artwork tabs — alpha-mask images tinted with the tab color, so the
// active/inactive states match the Ionicons tabs.
const TAB_IMAGES: Partial<Record<keyof MainTabParamList, number>> = {
  ChatsTab: require('../../../assets/tabs/chats-tab.png'),
  AiTab: require('../../../assets/tabs/ai-tab.png'),
};

const MainTabs = () => {
  const {total} = useUnread();
  const chatsBadge = total > 0 ? formatUnreadBadge(total) : undefined;
  return (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.brand,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarAllowFontScaling: false,
      tabBarLabelStyle: {fontFamily: typography.titleFamily, fontSize: 11, fontWeight: '700'},
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.borderSoft,
        height: 84,
        paddingTop: 6,
      },
      tabBarIcon: ({focused, color}) => {
        const image = TAB_IMAGES[route.name as keyof MainTabParamList];
        if (image) {
          return (
            <Image
              source={image}
              style={{width: 25, height: 25, tintColor: color, opacity: focused ? 1 : 0.9}}
              resizeMode="contain"
            />
          );
        }
        return (
          <Ionicons
            name={TAB_ICONS[route.name as keyof MainTabParamList][focused ? 0 : 1]}
            size={23}
            color={color}
          />
        );
      },
    })}>
    <Tab.Screen name="ExploreTab" component={ExploreNavigator} options={{tabBarLabel: 'Explore'}} />
    <Tab.Screen
      name="ChatsTab"
      component={ChatsNavigator}
      options={{
        tabBarLabel: 'Chats',
        tabBarBadge: chatsBadge,
        tabBarBadgeStyle: {
          backgroundColor: colors.notify,
          color: colors.textOnBrand,
          fontFamily: typography.titleFamily,
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          height: 18,
          lineHeight: 18,
        },
      }}
    />
    <Tab.Screen name="CommunitiesTab" component={CommunitiesNavigator} options={{tabBarLabel: 'Communities'}} />
    <Tab.Screen name="AiTab" component={AiNavigator} options={{tabBarLabel: 'AI'}} />
    <Tab.Screen name="EarnTab" component={EarnNavigator} options={{tabBarLabel: 'Earn'}} />
    <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{tabBarLabel: 'Me'}} />
  </Tab.Navigator>
  );
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const YayChatNavigation = () => {
  const {booting, session} = useAuth();

  if (booting) {
    return <SplashView />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      linking={linkingConfig}
      // A notification tapped from cold start resolves before the navigator
      // mounts; replaying it here is what makes that tap land on the right
      // screen instead of the default tab.
      onReady={flushPendingDeepLink}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute?.();
        if (route?.name) {
          analytics.screen(route.name);
        }
      }}>
      <RootStack.Navigator screenOptions={stackOptions}>
        {!session ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} options={{headerShown: false}} />
        ) : !session.onboarded ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} options={{headerShown: false}} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabs} options={{headerShown: false}} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
