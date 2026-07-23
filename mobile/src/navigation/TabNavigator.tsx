import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {StartMiningScreen, ViewMiningDetailScreen} from '../screens/mining';
import {ProfileScreen, RoleScreen} from '../screens/profile';
import {SupportPortal, ContactUs, FAQsScreen} from '../screens/support';
import {
  PrivacyScreen,
  TermsAndConditionScreen,
  TermsOfUse,
  UserAgreement,
} from '../screens/legal';
import {WhitePaperScreen, ReferralScreen} from '../screens/info';
import Subscription from '../screens/subscription/Subscription';
import CurrentSubscriptionDetail from '../screens/subscription/CurrentSubscriptionDetail';
import SelectPaymentMethod from '../screens/subscription/SelectPaymentMethod';
import AchDetail from '../screens/subscription/AchDetail';
import WireDetail from '../screens/subscription/WireDetail';
import VenmoDetail from '../screens/subscription/VenmoDetail';
import PaymentSuccessful from '../screens/subscription/PaymentSuccessful';
import ZelleDetail from '../screens/subscription/ZelleDetail';
import MainestDropDown from '../screens/MainestDropDown';
import UnverifiedBalanceScreen from '../screens/UnverifiedBalanceScreen';
import TransferableBalance from '../screens/TransferableBalance';
import UpdateProfile from '../screens/profile/UpdateProfile';
import AddAdditionalEmail from '../screens/profile/AddAdditionalEmail';
import AddPhoneNumb from '../screens/profile/AddPhoneNumb';
import UploadFileScreen from '../screens/subscription/UploadFile';
import TrackSubscription from '../screens/subscription/TrackYourSubscription';
import {
  ChatsHomeScreen,
  ContactProfileScreen,
  ConversationScreen,
  ContactsScreen,
  CallsScreen,
  DiscoverScreen,
  FeaturePreviewScreen,
  GroupStudioScreen,
  MeScreen,
  MiniAppsScreen,
  MomentsScreen,
  ServicesScreen,
  WalletHubScreen,
} from '../yaychat/screens';
import {yayTheme, yayTypography} from '../yaychat/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackOptions = {
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: yayTheme.colors.background,
  },
  headerTintColor: yayTheme.colors.ink,
  headerTitleStyle: {
    color: yayTheme.colors.ink,
    fontFamily: yayTypography.titleFamily,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  contentStyle: {
    backgroundColor: yayTheme.colors.background,
  },
};

const previewOptions = {
  title: 'Preview',
};

const ChatsStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen
      name="ChatsHome"
      component={ChatsHomeScreen}
      options={{title: 'YayChat'}}
    />
    <Stack.Screen
      name="Conversation"
      component={ConversationScreen}
      options={{title: 'Conversation'}}
    />
    <Stack.Screen
      name="ConversationPreview"
      component={FeaturePreviewScreen}
      options={previewOptions}
    />
    <Stack.Screen
      name="Calls"
      component={CallsScreen}
      options={{title: 'Calls'}}
    />
    <Stack.Screen
      name="GroupStudio"
      component={GroupStudioScreen}
      options={{title: 'Group Studio'}}
    />
  </Stack.Navigator>
);

const ContactsStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="ContactsHome" component={ContactsScreen} options={{title: 'Contacts'}} />
    <Stack.Screen
      name="ContactProfile"
      component={ContactProfileScreen}
      options={{title: 'Contact'}}
    />
    <Stack.Screen
      name="QRPreview"
      component={FeaturePreviewScreen}
      initialParams={{
        title: 'QR identity and add-contact',
        badge: 'Gap: medium',
        summary:
          'WeChat-style contact growth depends on QR identity cards, quick scan, and consented add flows.',
        highlights: [
          'Add contact by QR is not exposed in the current app.',
          'Merchant QR and personal QR should share a common scanner shell.',
          'Saved contacts need block, note, and favorite states.',
        ],
      }}
      options={previewOptions}
    />
  </Stack.Navigator>
);

const DiscoverStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="DiscoverHome" component={DiscoverScreen} options={{title: 'Discover'}} />
    <Stack.Screen
      name="MomentsPreview"
      component={MomentsScreen}
      options={{title: 'Moments'}}
    />
    <Stack.Screen
      name="PayPreview"
      component={WalletHubScreen}
      options={{title: 'Scan and Pay'}}
    />
    <Stack.Screen
      name="MiniAppsPreview"
      component={MiniAppsScreen}
      options={{title: 'Mini Apps'}}
    />
  </Stack.Navigator>
);

const ServicesStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="ServicesHome" component={ServicesScreen} options={{title: 'Services'}} />
    <Stack.Screen name="Mining" component={StartMiningScreen} options={{title: 'Mining Center'}} />
    <Stack.Screen name="MiningDetails" component={ViewMiningDetailScreen} options={{title: 'Mining Details'}} />
    <Stack.Screen name="Subscription" component={Subscription} options={{title: 'Subscription Plans'}} />
    <Stack.Screen
      name="CurrentSubscriptionDetail"
      component={CurrentSubscriptionDetail}
      options={{title: 'Subscription Details'}}
    />
    <Stack.Screen name="SelectPaymentMethod" component={SelectPaymentMethod} options={{title: 'Select Payment Method'}} />
    <Stack.Screen name="ACHDetail" component={AchDetail} options={{title: 'ACH Payment'}} />
    <Stack.Screen name="WireDetail" component={WireDetail} options={{title: 'Wire Transfer'}} />
    <Stack.Screen name="VenmoDetail" component={VenmoDetail} options={{title: 'Venmo Payment'}} />
    <Stack.Screen name="PaymentSuccessful" component={PaymentSuccessful} options={{title: 'Payment Successful'}} />
    <Stack.Screen name="ZelleDetail" component={ZelleDetail} options={{title: 'Zelle Payment'}} />
    <Stack.Screen name="Support" component={SupportPortal} options={{title: 'Support Portal'}} />
    <Stack.Screen name="ContactUs" component={ContactUs} options={{title: 'Contact Us'}} />
    <Stack.Screen name="FAQs" component={FAQsScreen} options={{title: 'FAQs'}} />
    <Stack.Screen name="Mainnet" component={MainestDropDown} options={{title: 'Mainnet'}} />
    <Stack.Screen name="Balances" component={UnverifiedBalanceScreen} options={{title: 'Wallet Balances'}} />
    <Stack.Screen name="TransferableBalance" component={TransferableBalance} options={{title: 'Transferable Balance'}} />
    <Stack.Screen name="UploadFile" component={UploadFileScreen} options={{title: 'Upload File'}} />
    <Stack.Screen name="TrackSubscription" component={TrackSubscription} options={{title: 'Track Subscription'}} />
    <Stack.Screen name="WhitePaper" component={WhitePaperScreen} options={{title: 'Whitepaper'}} />
    <Stack.Screen name="Referral" component={ReferralScreen} options={{title: 'Referral'}} />
  </Stack.Navigator>
);

const MeStack = () => (
  <Stack.Navigator screenOptions={stackOptions}>
    <Stack.Screen name="MeHome" component={MeScreen} options={{title: 'Me'}} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{title: 'Profile'}} />
    <Stack.Screen name="UpdateProfile" component={UpdateProfile} options={{title: 'Update Profile'}} />
    <Stack.Screen name="AddAdditionalEmail" component={AddAdditionalEmail} options={{title: 'Add Additional Email'}} />
    <Stack.Screen name="AddPhoneNumb" component={AddPhoneNumb} options={{title: 'Add Phone Number'}} />
    <Stack.Screen name="Roles" component={RoleScreen} options={{title: 'Roles'}} />
    <Stack.Screen name="Privacy" component={PrivacyScreen} options={{title: 'Privacy Policy'}} />
    <Stack.Screen name="Terms" component={TermsOfUse} options={{title: 'Terms of Use'}} />
    <Stack.Screen
      name="TermsAndConditions"
      component={TermsAndConditionScreen}
      options={{title: 'Terms and Conditions'}}
    />
    <Stack.Screen name="UserAgreement" component={UserAgreement} options={{title: 'User Agreement'}} />
  </Stack.Navigator>
);

const tabIcon = (routeName: string, focused: boolean) => {
  const color = focused ? yayTheme.colors.brand : yayTheme.colors.inkMuted;
  const iconMap: Record<string, string> = {
    ChatsTab: focused ? 'chatbubbles' : 'chatbubbles-outline',
    ContactsTab: focused ? 'people' : 'people-outline',
    DiscoverTab: focused ? 'compass' : 'compass-outline',
    ServicesTab: focused ? 'grid' : 'grid-outline',
    MeTab: focused ? 'person-circle' : 'person-circle-outline',
  };

  return <Ionicons name={iconMap[routeName] || 'ellipse-outline'} size={22} color={color} />;
};

const tabLabel = (label: string, focused: boolean) => (
  <Text
    style={{
      color: focused ? yayTheme.colors.brand : yayTheme.colors.inkMuted,
      fontFamily: yayTypography.titleFamily,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    }}>
    {label}
  </Text>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({route}) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        backgroundColor: yayTheme.colors.paper,
        borderTopColor: yayTheme.colors.line,
        height: 72,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarIcon: ({focused}) => tabIcon(route.name, focused),
    })}>
    <Tab.Screen
      name="ChatsTab"
      component={ChatsStack}
      options={{
        tabBarLabel: ({focused}) => tabLabel('Chats', focused),
      }}
    />
    <Tab.Screen
      name="ContactsTab"
      component={ContactsStack}
      options={{
        tabBarLabel: ({focused}) => tabLabel('Contacts', focused),
      }}
    />
    <Tab.Screen
      name="DiscoverTab"
      component={DiscoverStack}
      options={{
        tabBarLabel: ({focused}) => tabLabel('Discover', focused),
      }}
    />
    <Tab.Screen
      name="ServicesTab"
      component={ServicesStack}
      options={{
        tabBarLabel: ({focused}) => tabLabel('Services', focused),
      }}
    />
    <Tab.Screen
      name="MeTab"
      component={MeStack}
      options={{
        tabBarLabel: ({focused}) => tabLabel('Me', focused),
      }}
    />
  </Tab.Navigator>
);

export default TabNavigator;
