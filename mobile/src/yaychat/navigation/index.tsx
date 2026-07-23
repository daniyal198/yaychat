/** Yay-chat navigation tree. See docs/yaychat-navigation-map.md. */
import React from 'react';
import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, typography} from '../design/tokens';
import {useAuth} from '../state/AppProviders';
import {SplashView, ComingSoonScreen} from '../screens/shared/SharedScreens';
import {
  AuthStackParamList,
  AiStackParamList,
  ChatsStackParamList,
  CommunitiesStackParamList,
  EarnStackParamList,
  MainTabParamList,
  OnboardingStackParamList,
  ProfileStackParamList,
  RootStackParamList,
} from '../types/navigation';
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
} from '../screens/communities/CommunityScreens';
import {AiChatScreen, AiHistoryScreen, AiHomeScreen} from '../screens/ai/AiScreens';
import {
  CampaignDetailScreen,
  EarnHomeScreen,
  ReferralScreen,
  RewardDetailScreen,
  RewardHistoryScreen,
} from '../screens/earn/EarnScreens';
import {
  ReceivePreviewScreen,
  SendPreviewScreen,
  TransactionDetailScreen,
  WalletOverviewScreen,
  WalletTransactionsScreen,
} from '../screens/wallet/WalletScreens';
import {EcosystemScreen, ProductPreviewScreen} from '../screens/ecosystem/EcosystemScreens';
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

const ChatsStack = createNativeStackNavigator<ChatsStackParamList>();
const ChatsNavigator = () => (
  <ChatsStack.Navigator screenOptions={stackOptions}>
    <ChatsStack.Screen name="ChatList" component={ChatListScreen} options={{title: 'Yay-chat'}} />
    <ChatsStack.Screen name="ChatSearch" component={ChatSearchScreen} options={{title: 'Search'}} />
    <ChatsStack.Screen name="ArchivedChats" component={ArchivedChatsScreen} options={{title: 'Archived'}} />
    <ChatsStack.Screen name="NewChat" component={NewChatScreen} options={{title: 'New chat', presentation: 'modal'}} />
    <ChatsStack.Screen name="Conversation" component={ConversationScreen} options={{title: ''}} />
    <ChatsStack.Screen name="ConversationDetails" component={ConversationDetailsScreen} options={{title: 'Details'}} />
    <ChatsStack.Screen name="GroupMembers" component={GroupMembersScreen} options={{title: 'Members'}} />
    <ChatsStack.Screen name="SharedMedia" component={SharedMediaScreen} options={{title: 'Shared media'}} />
    <ChatsStack.Screen name="ForwardMessage" component={ForwardMessageScreen} options={{title: 'Forward to', presentation: 'modal'}} />
    <ChatsStack.Screen name="ContactProfile" component={ContactProfileScreen} options={{title: 'Profile'}} />
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
  </CommunitiesStack.Navigator>
);

const AiStack = createNativeStackNavigator<AiStackParamList>();
const AiNavigator = () => (
  <AiStack.Navigator screenOptions={stackOptions}>
    <AiStack.Screen name="AiHome" component={AiHomeScreen} options={{title: 'Yay AI'}} />
    <AiStack.Screen name="AiChat" component={AiChatScreen} options={{title: 'Yay AI'}} />
    <AiStack.Screen name="AiHistory" component={AiHistoryScreen} options={{title: 'History'}} />
  </AiStack.Navigator>
);

const EarnStack = createNativeStackNavigator<EarnStackParamList>();
const EarnNavigator = () => (
  <EarnStack.Navigator screenOptions={stackOptions}>
    <EarnStack.Screen name="EarnHome" component={EarnHomeScreen} options={{title: 'Earn'}} />
    <EarnStack.Screen name="RewardHistory" component={RewardHistoryScreen} options={{title: 'Reward history'}} />
    <EarnStack.Screen name="RewardDetail" component={RewardDetailScreen} options={{title: 'Reward'}} />
    <EarnStack.Screen name="Referral" component={ReferralScreen} options={{title: 'Invite friends'}} />
    <EarnStack.Screen name="CampaignDetail" component={CampaignDetailScreen} options={{title: 'Campaign'}} />
  </EarnStack.Navigator>
);

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={stackOptions}>
    <ProfileStack.Screen name="ProfileHome" component={ProfileHomeScreen} options={{title: 'Me'}} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{title: 'Edit profile'}} />
    <ProfileStack.Screen name="QrProfile" component={QrProfileScreen} options={{title: 'My QR'}} />
    <ProfileStack.Screen name="Contacts" component={ContactsScreen} options={{title: 'Friends'}} />
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
    <ProfileStack.Screen name="AboutLegal" component={AboutLegalScreen} options={{title: 'About Yay-chat'}} />
    <ProfileStack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{title: 'Delete account'}} />
    <ProfileStack.Screen name="Developer" component={DeveloperScreen} options={{title: 'Preview controls'}} />
  </ProfileStack.Navigator>
);

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, [string, string]> = {
  ChatsTab: ['chatbubbles', 'chatbubbles-outline'],
  CommunitiesTab: ['people', 'people-outline'],
  AiTab: ['sparkles', 'sparkles-outline'],
  EarnTab: ['gift', 'gift-outline'],
  ProfileTab: ['person-circle', 'person-circle-outline'],
};

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarActiveTintColor: colors.brand,
      tabBarInactiveTintColor: colors.tabInactive,
      tabBarLabelStyle: {fontFamily: typography.titleFamily, fontSize: 11, fontWeight: '700'},
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.borderSoft,
        height: 84,
        paddingTop: 6,
      },
      tabBarIcon: ({focused, color}) => (
        <Ionicons
          name={TAB_ICONS[route.name as keyof MainTabParamList][focused ? 0 : 1]}
          size={23}
          color={color}
        />
      ),
    })}>
    <Tab.Screen name="ChatsTab" component={ChatsNavigator} options={{tabBarLabel: 'Chats'}} />
    <Tab.Screen name="CommunitiesTab" component={CommunitiesNavigator} options={{tabBarLabel: 'Communities'}} />
    <Tab.Screen name="AiTab" component={AiNavigator} options={{tabBarLabel: 'AI'}} />
    <Tab.Screen name="EarnTab" component={EarnNavigator} options={{tabBarLabel: 'Earn'}} />
    <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{tabBarLabel: 'Me'}} />
  </Tab.Navigator>
);

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const YayChatNavigation = () => {
  const {booting, session} = useAuth();

  if (booting) {
    return <SplashView />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={stackOptions}>
        {!session ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} options={{headerShown: false}} />
        ) : !session.onboarded ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} options={{headerShown: false}} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabs} options={{headerShown: false}} />
            <RootStack.Screen name="WalletOverview" component={WalletOverviewScreen} options={{title: 'Wallet preview'}} />
            <RootStack.Screen name="WalletTransactions" component={WalletTransactionsScreen} options={{title: 'Activity'}} />
            <RootStack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{title: 'Transaction'}} />
            <RootStack.Screen name="SendPreview" component={SendPreviewScreen} options={{title: 'Send (preview)', presentation: 'modal'}} />
            <RootStack.Screen name="ReceivePreview" component={ReceivePreviewScreen} options={{title: 'Receive (preview)', presentation: 'modal'}} />
            <RootStack.Screen name="Ecosystem" component={EcosystemScreen} options={{title: 'Indexx ecosystem'}} />
            <RootStack.Screen name="ProductPreview" component={ProductPreviewScreen} options={{title: ''}} />
            <RootStack.Screen name="ComingSoon" component={ComingSoonScreen} options={{title: ''}} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
