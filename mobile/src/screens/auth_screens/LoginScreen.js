import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import Button from '../../components/Button';
import PasswordTextField from '../../components/PasswordTextField';
import TextField from '../../components/TextField';
import SocialMediaButton from '../../components/SocialMediaButton';
import { useAuth } from '../../context/AuthContext';
import BitcoinYay from '../../../assets/img/yay_03.svg';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import GoogleIcon from '../../../assets/img/google_icon.svg';
import AppleIcon from '../../../assets/img/apple_icon.svg';
import PhoneIcon from '../../../assets/img/call_icon.svg';
import PhonePng from '../../../assets/img/call_icon.png';
import {
  loginAPI,
  checkByemail,
  loginHive,
  loginWithGoogle,
  signupWithGoogle,
  saveDeviceToken,
  loginWithApple,
} from '../../services/auth.service';
import OvalButton from '../../components/OvalButton';
import messaging from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import appleAuth, {
  AppleRequestOperation,
  AppleRequestScope,
  AppleCredentialState,
  appleAuthAndroid
} from '@invertase/react-native-apple-authentication';
import UserActivityTrackingPopup from './UserActivityTrackingPopup';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [showTrackingPopup, setShowTrackingPopup] = useState(false);
  const [tempAuthToken, setTempAuthToken] = useState(null);

  const validateEmail = value => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePassword = value => {
    return value.length >= 8;
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {

      await GoogleSignin.revokeAccess().catch(() => { });
      await GoogleSignin.signOut().catch(() => { });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const userInfo = await GoogleSignin.signIn();

      console.log('Google user info:', userInfo);
      // 👉 Now get the access token
      const tokens = await GoogleSignin.getTokens();
      const token = tokens.accessToken;


      if (!tokens?.accessToken) {
        Alert.alert('Login Cancelled', 'No token retrieved. Please try again.');
        return;
      }

      let res;
      if (token) {
        res = await loginWithGoogle(token);
        console.log('Google login response:', res);
      } else {
        Alert.alert('Login Failed', 'Failed to get Google token.');
      }

      console.log("res in google res", res)
      if (res?.data?.access_token && res?.status === 200) {
        await updateDeviceInfo();
        await login(res.data.access_token);
        navigation.navigate('Home');
      } else if (
        res.status === 500 &&
        res.data.message.includes(
          'Please log in using direct email process',
        )
      ) {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        Alert.alert(
          'Error',
          'Email already registered with direct email process. Please login with email and password',
        );
      }
      else {
        // If login failed, show alert instead of trying to signup
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        Alert.alert(
          'Account Not Found',
          'No account associated with this Google account. Please register first.',
        );
      }
    }
    catch (error) {
      console.error('Google Sign-In error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Login Cancelled', 'You cancelled the login process.');
      } else {
        console.error('Google Sign-In error:', error);
        await GoogleSignin.revokeAccess().catch(() => { });
        await GoogleSignin.signOut().catch(() => { });
        Alert.alert('Login Error', 'Failed to login with Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };


  const generateRandomString = (length) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  };

  const handleAppleLogin = async () => {
    try {
      setIsAppleLoading(true); // reuse loading state for now (you can separate later)

      if (Platform.OS === 'android') {
        // ANDROID Apple Login
        const rawNonce = generateRandomString(32);
        const state = generateRandomString(16);

        appleAuthAndroid.configure({
          clientId: "com.bitcoinyay.appname", // your clientId
          redirectUri: "https://bitcoin-yay-a5f9f.firebaseapp.com/__/auth/handler", // your redirect
          responseType: appleAuthAndroid.ResponseType.ALL,
          scope: appleAuthAndroid.Scope.ALL,
          nonce: rawNonce,
          state,
        });

        const response = await appleAuthAndroid.signIn();
        const { id_token } = response;

        if (!id_token) {
          throw new Error('Apple ID token not found.');
        }

        const res = await loginWithApple(id_token);

        console.log("res", res)
        if (res?.data?.access_token && res?.status === 200) {
          await updateDeviceInfo();
          await login(res.data.access_token);
          navigation.navigate('Home');
        } else if (
          res.status === 500 &&
          res.data.message.includes(
            'Please log in using direct email process',
          )
        ) {
          Alert.alert(
            'Error',
            'Email already registered with direct email process. Please login with email and password',
          );
        } else {
          Alert.alert('Login Failed', 'No account found, please register.');
        }
      } else {
        // iOS Apple Login
        const appleAuthRequestResponse = await appleAuth.performRequest({
          requestedOperation: appleAuth.Operation.LOGIN,
          requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
        });

        if (!appleAuthRequestResponse.identityToken) {
          Alert.alert('Apple login failed', 'No identity token returned. Please try again.');
          return;
        }

        const res = await loginWithApple(appleAuthRequestResponse.identityToken);

        console.log("res", res)

        if (res?.data?.access_token && res?.status === 200) {
          await login(res.data.access_token);
          await updateDeviceInfo();
          navigation.navigate('Home');
        } else if (
          res.status === 500 &&
          res.data.message.includes(
            'Please log in using direct email process',
          )
        ) {
          Alert.alert(
            'Error',
            'Email already registered with direct email process. Please login with email and password',
          );
        } else {
          Alert.alert('Login Failed', 'No account found, please register.');
        }
      }
    } catch (error) {
      console.error('Apple Login Error:', error);
      Alert.alert('Apple Login Failed', error.message || 'Apple sign-in failed');
    } finally {
      setIsAppleLoading(false);
    }
  };


  const getDeviceInfo = async () => {
    return {
      token: await messaging().getToken(),
      type: Platform.OS,
      model: DeviceInfo.getModel(),
      osVersion: DeviceInfo.getSystemVersion(),
      brand: DeviceInfo.getBrand(),
      uniqueId: DeviceInfo.getUniqueId()
    };
  };

  const updateDeviceInfo = async () => {
    try {
      const deviceData = await getDeviceInfo();
      const response = await saveDeviceToken(email, deviceData.token, deviceData.type, deviceData.model, deviceData.osVersion, deviceData.brand, deviceData.uniqueId);
      console.log('Device info update response:', response);
      return await response.json();
    } catch (error) {
      console.error('Device info update failed:', error);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await checkByemail(email);
      console.log('Email check response:', res);

      if (res.userType === 'HoneyBee' || res.userType === 'Indexx Exchange') {
        const res1 = await loginAPI(email, password);
        console.log('Login API response:', res1);

        if (res1.status === 200) {
          setTempAuthToken(res1.data.access_token);
          setShowTrackingPopup(true);
        } else if (res1.status === 403) {
          setErrorMessage(res1.data.message || 'Login method mismatch. Please use the correct provider.');
          Alert.alert('Login Restricted', res1.data.message);
        } else {
          setErrorMessage(
            "Incorrect password. Please try again or tap 'Forgot Password?' to reset it.",
          );
        }
      } else if (res.userType === 'CaptainBee') {
        const res2 = await loginHive(email, password);
        console.log('Hive login response:', res2);

        if (res2.status === 200) {
          setTempAuthToken(res2.data.access_token);
          setShowTrackingPopup(true);
        } else if (res2.status === 403) {
          setErrorMessage(res2.data.message || 'Login method mismatch. Please use the correct provider.');
          Alert.alert('Login Restricted', res2.data.message);
        } else {
          setErrorMessage(
            "Incorrect password. Please try again or tap 'Forgot Password?' to reset it.",
          );
        }
      } else if (res.status === 200 && res.success) {
        setErrorMessage(
          'No account found with this email. Please sign up first.',
        );
        Alert.alert(
          'Account Not Found',
          'No account associated with this email. Please register first.',
        );
      }
    } catch (error) {
      console.log('Login error:', error);
      Alert.alert(
        'Login Failed',
        'Something went wrong. Please check your connection and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackingAllow = async () => {
    try {
      await updateDeviceInfo();
      await login(tempAuthToken);
      setShowTrackingPopup(false);
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error during tracking allow:', error);
      Alert.alert('Error', 'Failed to complete login process. Please try again.');
    }
  };

  const handleTrackingClose = async () => {
    setShowTrackingPopup(false);
    setTempAuthToken(null);
    // Clear any stored auth state
    await login(null);
  };

  const handleEmailChange = value => {
    setEmail(value);
    setEmailError(validateEmail(value) ? '' : 'Please enter a valid email');
  };

  const handlePasswordChange = value => {
    setPassword(value);
    setPasswordError(
      validatePassword(value)
        ? ''
        : 'Password must be at least 8 characters long.',
    );
  };

  const handleEmailBlur = () => {
    if (email) {
      setEmailError(validateEmail(email) ? '' : 'Please enter a valid email');
    } else {
      setEmailError(''); // Clear error if field is empty
    }
  };

  const isButtonDisabled =
    !email || !password || !!emailError || !!passwordError || isLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flexContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Text Content */}
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.description}>Welcome To</Text>
            <BitcoinYay style={styles.logo} />
          </View>

          <View style={styles.inputContainer}>
            <TextField
              label="Email"
              value={email}
              onChangeText={handleEmailChange}
              onBlur={handleEmailBlur}
              numberOfLines={1}
              placeholder="Email"
              multiline={false}
            />
            {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
          </View>
          {/* Email Fields */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <PasswordTextField
              placeholder="Password"
              value={password}
              onChangeText={handlePasswordChange}
            />
            {!!passwordError && (
              <Text style={styles.errorText}>{passwordError}</Text>
            )}
          </View>
          {!!errorMessage && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
          <View
            style={{
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgetPassword')}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* <Button
            title="Login"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isButtonDisabled}
          /> */}
          <View style={{ marginTop: 40, marginBottom: 10 }}>
            <OvalButton
              textInsideOval="Login"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isButtonDisabled}
            />
          </View>

          <View style={styles.orContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>Or Login With</Text>
            <View style={styles.line} />
          </View>

          {/* Buttons Wrapper */}
          <View style={styles.buttonContainer}>
            {/* <SocialMediaButton
              Icon={GoogleIcon}
              title={'Login With Google'}
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}
              loading={isGoogleLoading}
            /> */}

            <OvalButton
              IconInsideOval={GoogleIcon}
              label="Google"
              onPress={handleGoogleLogin}
              disabled={isGoogleLoading}
              loading={isGoogleLoading}
            />

            <OvalButton
              IconInsideOval={AppleIcon}
              label="Apple"
              onPress={handleAppleLogin}
              disabled={isAppleLoading}
              loading={isAppleLoading}
            />

            {/* <SocialMediaButton
              Icon={AppleIcon}
              title="Login With Apple"
              onPress={handleLogin}
            /> */}
            {/* <OvalButton
              IconInsideOval={PhonePng}
              label="Phone"
              isPng={true}
              onPress={() => navigation.navigate('LoginWithPhone')}
            /> */}
            {/* <SocialMediaButton
              Icon={PhoneIcon}
              title="Login With Phone"
              onPress={() => navigation.navigate('LoginWithPhone')}
            /> */}
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <UserActivityTrackingPopup
        visible={showTrackingPopup}
        onClose={handleTrackingClose}
        onAllow={handleTrackingAllow}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flexGrow: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    width: '100%',
    position: 'relative',
  },
  logo: {
    width: 250,
    marginBottom: 55,
  },

  buttonContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 20,
  },
  description: {
    color: 'white',
    marginTop: 50,
    fontSize: 17,
    maxWidth: 325,
    fontWeight: 'regular',
    marginBottom: 5,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#868687',
    marginHorizontal: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  orText: {
    color: '#868687',
    fontSize: 16,
  },
  forgotPassword: {
    color: 'white',
    textAlign: 'right',
    marginBottom: 15,
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'left',
    color: 'white',
  },
  inputContainer: {
    width: '100%',
  },
  footer: {
    color: '#F88D39',
    fontSize: 12,
    position: 'absolute',
    bottom: 20,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  registerText: {
    color: '#fff',
    fontSize: 14,
  },
  registerLink: {
    color: '#F88D39',
    fontWeight: 'bold',
    textDecorationLine: 'underline', // Adds underline
    fontSize: 14,
  },
});

export default LoginScreen;
