import {NativeStackNavigationProp} from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Home: undefined;
  Register: undefined;
  ForgetPassword: undefined;
  VerifyEmail: undefined;
  ResetPassword: undefined;
  WhoInvitedYou: undefined;
  TermsAndConditions: undefined;
  TermsofUse: undefined;
  PrivacyPolicy: undefined;
  RegisterWithPhone: undefined;
  LoginWithPhonePassword: { phone: string };
  LoginWithPhoneForgetPassword: { phone: string };
  LoginWithPhoneVerifyPhoneNumber: { phone: string };
  EnterEmail: {
    phoneNumber: string;
    callingCode: string;
    countryCode: string;
  };
  VerifyPassword: undefined;
  SetupYourAccount: undefined;
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export type SubscriptionStackParamList = {
  CurrentSubscription: undefined;
  Subscription: undefined;
  SelectPaymentMethod: { planName: string; amount: string };
  PaymentSuccessful: {
    planName?: string; 
    amount?: string; 
    paymentMethod?: string, 
    orderId?: string;
    currency?: string;
    paymentType?: string;
  };
  UploadFile: {
    orderId?: string;
    paymentType?: string;
    amount?: number;
    currency?: string;
    fromDetails?: any;
    toDetails?: any;
    email?: string; 
  };
  TrackSubscription: {
    orderId?: string;
    paymentType?: string;
    amount?: number;
    currency?: string;
  };  
  VenmoDetail: { order: any };
  AchDetail: { order: any };
  ZelleDetail: { order: any };
  WireDetail: { order: any };
};

export type SubscriptionNavigationProp =
  NativeStackNavigationProp<SubscriptionStackParamList>;
