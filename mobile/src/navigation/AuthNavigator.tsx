import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth_screens/LoginScreen';
import {colors} from '../theme/colors';
import CreateAccountScreen from '../screens/auth_screens/CreateAccountScreen';
import ForgetPasswordScreen from '../screens/auth_screens/ForgetPassword';
import RegisterWithPhone from '../screens/auth_screens/RegisterWithPhone/RegisterWithPhone';
import EnterEmailScreen from '../screens/auth_screens/RegisterWithPhone/EnterEmailScreen';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {View, Text} from 'react-native';
import EmailVerificationScreen from '../screens/auth_screens/EmailVerificationScreen';
import ResetPasswordScreen from '../screens/auth_screens/ResetPasswordScreen';
import SendInvitationCodeScreen from '../screens/auth_screens/SendInvitationCodeScreen';
import {
  PrivacyScreen,
  TermsAndConditionScreen,
  TermsOfUse,
  UserAgreement,
} from '../screens/legal';
import VerifyPassword from '../screens/auth_screens/RegisterWithPhone/VerifyPassword';
import SetupYourAccount from '../screens/auth_screens/RegisterWithPhone/SetupYourAccount';
import LoginWithPhonePassword from '../screens/auth_screens/LoginWithPhone/LoginWithPhonePassword';
import LoginWithPhone from '../screens/auth_screens/LoginWithPhone/LoginWithPhone';
import LoginWithPhoneForgetPassword from '../screens/auth_screens/LoginWithPhone/LoginWithPhoneForgetPassword';
import LoginWithPhoneVerifyPhoneNumber from '../screens/auth_screens/LoginWithPhone/LoginWithPhoneVerifyPhoneNumber';
import SliderAuth from '../screens/auth_screens/SliderAuth';
const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}>
      <Stack.Screen name="SliderAuth" component={SliderAuth} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={CreateAccountScreen} />
      <Stack.Screen
        name="LoginWithPhonePassword"
        component={LoginWithPhonePassword}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Enter Password</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />
      <Stack.Screen
        name="LoginWithPhone"
        component={LoginWithPhone}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Login with Phone</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="LoginWithPhoneForgetPassword"
        component={LoginWithPhoneForgetPassword}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Forget Password</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="LoginWithPhoneVerifyPhoneNumber"
        component={LoginWithPhoneVerifyPhoneNumber}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>
                Verify Phone Number
              </Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="RegisterWithPhone"
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>
                Sign Up With Phone
              </Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
        component={RegisterWithPhone}
      />
      <Stack.Screen
        name="VerifyPassword"
        component={VerifyPassword}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Verify Password</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />
      <Stack.Screen
        name="EnterEmail"
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Enter Email</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
        component={EnterEmailScreen}
      />
      <Stack.Screen
        name="SetupYourAccount"
        component={SetupYourAccount}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>
                Setup Your Account
              </Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />
      <Stack.Screen
        name="ForgetPassword"
        component={ForgetPasswordScreen}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Forget Password</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="VerifyEmail"
        component={EmailVerificationScreen}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}> Email Verify</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Reset Password</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="WhoInvitedYou"
        component={SendInvitationCodeScreen}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Invitation</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="TermsAndConditions"
        component={TermsAndConditionScreen}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>
                Terms & Conditions
              </Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="TermsofUse"
        component={TermsOfUse}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Terms of Use</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyScreen}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>Privacy Policy</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />

      <Stack.Screen
        name="UserAgreement"
        component={UserAgreement}
        options={({navigation}) => ({
          headerShown: true,
          headerTitle: '',
          headerLeft: () => (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Ionicons
                name="chevron-back-outline"
                size={24}
                color={colors.textPrimary}
                onPress={() => navigation.goBack()}
                style={{marginRight: 5}}
              />
              <Text style={{color: colors.textPrimary}}>User Agreement</Text>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
        })}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
