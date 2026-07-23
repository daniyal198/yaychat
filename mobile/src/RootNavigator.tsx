import { createStackNavigator } from '@react-navigation/stack';
import StartScreen from './screens/auth_screens/StartScreen';
import LoginScreen from './screens/auth_screens/LoginScreen';
import RegisterScreen from './screens/auth_screens/RegisterScreen';
import RegisterWithPhoneNumber from './screens/auth_screens/RegisterWithPhoneNumber';
import LoginWithPassword from './screens/auth_screens/LoginWithPassword';
import LoginWithPhoneNumber from './screens/auth_screens/LoginWithPhoneNumber';
import ForgetPassword from './screens/auth_screens/ForgetPassword';
import PasswordRecoveryWithCountryPhoneField from './screens/auth_screens/PasswordRecoveryWithCountryPhoneFields';
import SetPasswordVerificationCode from './screens/auth_screens/SetPasswordVerificationCode';
import CreatePasswordScreen from './screens/auth_screens/ResetPasswordScreen';
import CreateAccountScreen from './screens/auth_screens/CreateAccountScreen';
import EmailVerificationScreen from './screens/auth_screens/EmailVerificationScreen';
import SendInvitationCodeScreen from './screens/auth_screens/SendInvitationCodeScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';
import StartMiningScreen from './screens/StartMiningScreen';
import { ViewMiningDetailScreen } from './screens/mining';
import { TermsAndConditionScreen } from './screens/legal';
import VerifyPassword from './screens/auth_screens/RegisterWithPhone/VerifyPassword';



export type RootStackParamsList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  RegisterWithPhone: undefined;
  LoginWithPhone: undefined;
  LoginWithPhonePassword: { phone: string };
  LoginWithPhoneForgetPassword: { phone: string };
  LoginWithPhoneVerifyPhoneNumber: { phone: string };
  ForgetPassword: undefined;
  PasswordRecovery: undefined;
  TextVerificationCode: undefined;
  CreatePassword: undefined;
  CreateAccount: undefined;
  EmailVerification: undefined;
  WhoInvitedYou: undefined;
  StartMining: undefined;
  MiningDetails: undefined;
  VerifyEmail: { email: string, isPhone?: boolean, verificationType?: 'email' | 'phone'; userType?: string }
  ResetPassword: { email?: string, phone?: string, callingCode?: string, countryCode?: string };
  SetPasswordVerificationCode: undefined;
  TermsAndConditions: undefined;
  EnterEmail: {
    phoneNumber: string;
    callingCode: string;
    countryCode: string;
  };
  VerifyPassword: {
    phoneNumber: string;
    callingCode: string;
    countryCode: string;
    email: string;
  };

};

// create a stack navigator here
const Stack = createStackNavigator<RootStackParamsList>();

const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        cardStyle: { backgroundColor: '#000' },
        headerBackButtonDisplayMode: 'generic',
        title: '',
        headerTintColor: 'white',
        headerBackTitleStyle: {
          fontSize: 12, // Reduce font size of the back button text
        },
        headerBackImage: ({ tintColor }) => (
          <Ionicons name="caret-back-outline" size={14} color={tintColor} />
        ),
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
        },
      }}>
      <Stack.Screen name="Home" component={StartScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="RegisterWithPhone"
        component={RegisterWithPhoneNumber}
      />
      <Stack.Screen name="CreatePassword" component={CreatePasswordScreen} />
      <Stack.Screen name="ResetPassword" component={CreatePasswordScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />

      <Stack.Screen name="WhoInvitedYou" component={SendInvitationCodeScreen} />
      <Stack.Screen name="LoginWithPhone" component={LoginWithPhoneNumber} />
      <Stack.Screen name="LoginWithPhonePassword" component={LoginWithPassword} />
      <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
      <Stack.Screen
        name="PasswordRecovery"
        component={PasswordRecoveryWithCountryPhoneField}
      />
      <Stack.Screen
        name="TextVerificationCode"
        component={SetPasswordVerificationCode}
      />

      <Stack.Screen name="StartMining" component={StartMiningScreen} />
      <Stack.Screen name="MiningDetails" component={ViewMiningDetailScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsAndConditionScreen} />
      <Stack.Screen
        name="VerifyEmail"
        component={EmailVerificationScreen}
        options={({ route }) => ({
          title: route.params?.isPhone ? 'Verify Phone' : 'Verify Email',
        })}
      />
      <Stack.Screen name="VerifyPassword" component={VerifyPassword} />
    </Stack.Navigator>
  );
};

export default RootNavigator;
