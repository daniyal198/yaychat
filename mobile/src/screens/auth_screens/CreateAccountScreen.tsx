import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { checkEmail, checkUsername, sendOtp, signupWithApple } from '../../services/auth.service';
import TextField from '../../components/TextField';
import { useNavigation } from '@react-navigation/native';
import PasswordTextField from '../../components/PasswordTextField';
import CountryPicker, { DARK_THEME } from 'react-native-country-picker-modal';

import BitcoinYay from '../../../assets/img/yay_03.svg';
import GoogleIcon from '../../../assets/img/google_icon.svg';
import AppleIcon from '../../../assets/img/apple_icon.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamsList } from '../../RootNavigator';
import { useUserRegistration } from '../../context/UserRegistrationContext';
import {GoogleSignin, statusCodes} from '@react-native-google-signin/google-signin';
import { signupWithGoogle } from '../../services/auth.service';
import OvalButton from '../../components/OvalButton';
import appleAuth, {appleAuthAndroid} from '@invertase/react-native-apple-authentication';

export type AuthNavigationProp = StackNavigationProp<RootStackParamsList>;

const CreateAccountScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, _setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [errors, setErrors] = useState({
    email: '',
    emailUsed: '',
    username: '',
    passwordMatch: '',
    passwordStrength: '',
  });
  const CountryPickerAny: any = CountryPicker;
  const [countryCode, setCountryCode] = useState('US'); // Default country
  const { setRegistrationData } = useUserRegistration();

  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setErrors(prev => ({
      ...prev,
      email:
        email.length && !emailRegex.test(email) ? 'Invalid email format' : '',
    }));
  }, [email]);

  useEffect(() => {
    const passwordStrengthRegex =
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+]{8,}$/;
    setErrors(prev => ({
      ...prev,
      passwordStrength:
        password && !passwordStrengthRegex.test(password)
          ? 'Password must be at least 8 characters with letters and numbers'
          : '',
    }));
  }, [password]);

  useEffect(() => {
    setErrors(prev => ({
      ...prev,
      passwordMatch:
        password && confirmPassword && password !== confirmPassword
          ? 'Passwords do not match'
          : '',
    }));
  }, [password, confirmPassword]);

  useEffect(() => {
    const checkUsernameAvailability = async () => {
      if (username) {
        const res = await checkUsername(username);
        console.log('res', res);

        if (res.status === 200 && !res.success) {
          setErrors(prev => ({
            ...prev,
            username: 'Username already taken',
          }));
        } else {
          setErrors(prev => ({
            ...prev,
            username: '',
          }));
        }
      }
    };

    checkUsernameAvailability();
  }, [username]);

  useEffect(() => {
    const checkAvailability = async () => {
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const res = await checkEmail(email);
        console.log('res', res);
        if (res.status === 200 && !res.success) {
          setErrors(prev => ({
            ...prev,
            emailUsed: 'Email is already registered. Please log in.',
          }));
        } else {
          setErrors(prev => ({ ...prev, emailUsed: '' }));
        }
      }
    };
    checkAvailability();
  }, [email]);

  const isFormValid =
    firstName &&
    lastName &&
    username &&
    email &&
    password &&
    confirmPassword &&
    !errors.email &&
    !errors.emailUsed &&
    !errors.username &&
    !errors.passwordMatch &&
    !errors.passwordStrength;

  const handleRegister = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    try {
      // const res0 = await registerUser({
      //   firstName,
      //   lastName,
      //   username,
      //   email,
      //   country: selectedCountry?.name?.common || '',
      //   countryCode,
      //   phoneNumber: phone,
      //   password,
      //   confirmPassword,
      // });

      // Save all values
      setRegistrationData({
        firstName,
        lastName,
        username,
        email,
        phoneNumber: phone,
        countryCode,
        country: selectedCountry?.name?.common || '',
        password,
        confirmPassword,
      });
      // console.log("res", res);
      let res = await sendOtp(email, 'New Register'); // uncomment when your function is available
      if (res.status === 400) {
        Alert.alert('Error', res.message || 'Registration failed');
      } else if (res.status === 200) {
        // Navigate or show success
        navigation.navigate('VerifyEmail', {
          email: String(email),
          isPhone: false,
          verificationType: 'email',
          userType: 'NewRegister',
        });
      } else if (res.status === 500) {
        console.log('Register error:', res);
        Alert.alert('Error', res.data || 'Registration failed');
      } else {
        Alert.alert('Error', 'Registration failed');
      }
    } catch (error: any) {
      console.log('Register error:', error);
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onSelectCountry = (country: any) => {
    setCountryCode(country.cca2);
    setSelectedCountry(country); // Save the selected country object
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.revokeAccess().catch(() => { });
      await GoogleSignin.signOut().catch(() => { });

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      console.log('Google Sign-In response:', response);
      // Fetch both ID token and access token
      const { accessToken } = await GoogleSignin.getTokens();

      if (accessToken) {
        const res = await signupWithGoogle(accessToken);

        if (res?.status === 200 && res.data?.access_token) {
          Alert.alert(
            'Signup Successful',
            'Your Google account has been registered. Please log in to continue.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Login'),
              },
            ],
          );
        } else if (
          res.status === 500 &&
          res.data.includes(
            'Email already registered with direct email process',
          )
        ) {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          Alert.alert(
            'Error',
            'Email already registered with direct email process. Please login with email and password',
          );
        } else if (
          res.status === 500 &&
          res.data.includes('Email already registered with Google')
        ) {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          Alert.alert(
            'Error',
            'Email already registered with Google. Please login with Google',
          );
        } else {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          Alert.alert('Error', res.message || 'Google signup failed');
        }
      } else {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        Alert.alert('Error', 'Missing Google access token.');
      }
    } catch (error: any) {
      // Handle cancel explicitly
      if (
        error.code === statusCodes.SIGN_IN_CANCELLED ||
        error.message?.toLowerCase().includes('cancelled')
      ) {
        Alert.alert('Cancelled', 'You cancelled the Google signup.');
      } else {
        Alert.alert('Signup Error', 'Failed to signup with Google.');
      }
      await GoogleSignin.revokeAccess().catch(() => { });
      await GoogleSignin.signOut().catch(() => { });
      console.log('Google signup error:', error);
    } finally {
      setIsGoogleLoading(false); // stop loading
    }
  };

  // Utility function to generate random string
  const generateRandomString = (length: number) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  };

  const handleAppleSignup = async () => {
    try {
      setIsAppleLoading(true);
      if (Platform.OS === 'android') {
        // Android implementation
        const rawNonce = generateRandomString(32); // 32 characters for nonce
        const state = generateRandomString(16); // 16 characters for state

        appleAuthAndroid.configure({
          clientId: "com.bitcoinyay.appname",
          redirectUri: "https://bitcoin-yay-a5f9f.firebaseapp.com/__/auth/handler", // your redirect
          responseType: appleAuthAndroid.ResponseType.ALL,
          scope: appleAuthAndroid.Scope.ALL,
          nonce: rawNonce,
          state,
        });

        const responseFromApple = await appleAuthAndroid.signIn();
        const { id_token, nonce } = responseFromApple;

        const tokenResponse = {
          appleToken: id_token,
          nonce,
          user: responseFromApple.user?.email || '', // Use email as user identifier
          email: responseFromApple.user?.email || '',
          fullName: responseFromApple.user?.name
            ? {
              givenName: responseFromApple.user.name.firstName,
              familyName: responseFromApple.user.name.lastName
            }
            : null
        };

        const res = await signupWithApple(tokenResponse.appleToken);
        handleAppleSignupResponse(res);
      } else {
        // iOS implementation
        const appleAuthRequestResponse = await appleAuth.performRequest({
          requestedOperation: 1,
          requestedScopes: [0, 1],
        });

        if (!appleAuthRequestResponse.identityToken) {
          throw new Error("Apple Sign-In failed - no identify token returned");
        }

        const tokenResponse = {
          identityToken: appleAuthRequestResponse.identityToken,
          nonce: appleAuthRequestResponse.nonce,
          user: appleAuthRequestResponse.user,
          email: appleAuthRequestResponse.email,
          fullName: appleAuthRequestResponse.fullName
        };

        const res = await signupWithApple(tokenResponse.identityToken);
        handleAppleSignupResponse(res);
      }
    } catch (error: any) {
      console.log('Apple signup error:', error);
      if (error.code === appleAuth.Error.CANCELED || error.code === '1001') {
        Alert.alert('Cancelled', 'Apple sign-in was cancelled');
      } else {
        Alert.alert('Error', 'Apple signup failed');
      }
    } finally {
      setIsAppleLoading(false); // stop loading
    }
  };

  const handleAppleSignupResponse = (res: any) => {
    console.log('Apple signup response:', res);
    if (res?.status === 200) {
      Alert.alert(
        'Signup Successful',
        'Your Apple account has been registered.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
      );
    } else if (res?.status === 500) {
      if (res.data.includes('Email already registered with direct email process')) {
        Alert.alert(
          'Error',
          'Email already registered with direct email process. Please login with email and password'
        );
      }
      else if (res.data.includes('Email already registered with Apple')) {
        Alert.alert(
          'Error',
          'Email already registered with Apple. Please login'
        );
      } else {
        Alert.alert('Error', res?.message || 'Apple signup failed');
      }
    } else {
      Alert.alert('Error', 'Apple signup failed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flexContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Logos */}
          <Text style={styles.description}>Welcome To</Text>
          <BitcoinYay style={styles.logo} />

          {/* Text Content */}

          {/* Input Fields */}
          <TextField
            label="First Name"
            value={firstName}
            onChangeText={setFirstName}
            placeholder={'First Name'}
            multiline={false}
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChangeText={setLastName}
            placeholder={'Last Name'}
            multiline={false}
          />
          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder={'Username'}
            multiline={false}
          />
          {errors.username ? (
            <Text style={styles.errorText}>{errors.username}</Text>
          ) : null}

          <Text style={styles.label}>Country</Text>
          <View style={styles.pickerContainer}>
            <CountryPickerAny
              withFilter
              withFlag
              withCountryNameButton
              countryCode={countryCode}
              onSelect={onSelectCountry}
              theme={DARK_THEME}
            />
          </View>
          {/* <TextField
            label="Phone Number(Optional)"
            value={phone}
            onChangeText={_setPhone}
            placeholder={'Phone Number'}
            multiline={false}
          /> */}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder={'Email'}
            multiline={false}
          />
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}
          {errors.emailUsed ? (
            <Text style={styles.errorText}>{errors.emailUsed}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <PasswordTextField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
            />
            {errors.passwordStrength ? (
              <Text style={styles.errorText}>{errors.passwordStrength}</Text>
            ) : null}
            <Text style={[styles.label, { marginTop: 20 }]}>
              Confirm Password
            </Text>
            <PasswordTextField
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
            />
            {errors.passwordMatch ? (
              <Text style={styles.errorText}>{errors.passwordMatch}</Text>
            ) : null}
          </View>
          {/* Submit Button */}
          {/* <Button
            title="Register"
            onPress={handleRegister}
            loading={isLoading}
            disabled={!isFormValid || isLoading}
          /> */}
          <View style={{ marginVertical: 10 }}>
            <OvalButton
              textInsideOval="Register"
              onPress={handleRegister}
              loading={isLoading}
              disabled={!isFormValid || isLoading}
            />
          </View>
          <View style={styles.orContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>Or Register With</Text>
            <View style={styles.line} />
          </View>
          {/* Buttons Wrapper */}
          <View style={styles.buttonContainer}>
            {/* <SocialMediaButton
              Icon={GoogleIcon}
              title="Sign Up With Google"
              onPress={handleGoogleSignup}
              loading={isGoogleLoading}
              disabled={isGoogleLoading}
            /> */}
            <OvalButton
              label="Google"
              IconInsideOval={GoogleIcon}
              onPress={handleGoogleSignup}
              loading={isGoogleLoading}
              disabled={isGoogleLoading}
            />

            {/* {Platform.OS === 'ios' && (
              <View style={styles.appleButtonWrapper}>
                <AppleButton
                  buttonStyle={AppleButton.Style.WHITE}
                  buttonType={AppleButton.Type.SIGN_IN}
                  style={styles.appleButton}
                  onPress={handleAppleSignup}
                />
              </View>
            )} */}


            {/* {Platform.OS === 'ios' && ( */}
            <OvalButton
              label="Apple"
              IconInsideOval={AppleIcon}
              onPress={handleAppleSignup}
              loading={isAppleLoading}
              disabled={isAppleLoading}
            />
            {/* )} */}


            {/* <SocialMediaButton
              Icon={AppleIcon}
              title="Sign Up With Apple"
              onPress={() => navigation.navigate('VerfiyEmail')}
            /> */}
            {/* 
            <SocialMediaButton
              Icon={PhoneIcon}
              title="Sign Up With Phone"
              onPress={() => navigation.navigate('RegisterWithPhone')}
            /> */}
            {/* <OvalButton
              label="Phone"
              IconInsideOval={PhonePng}
              isPng={true}
              onPress={() => navigation.navigate('RegisterWithPhone')}
            /> */}
          </View>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}> Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.registerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'black',
    paddingHorizontal: 15, // Ensures padding is applied
    paddingBottom: 35,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'left',
    color: 'white',
    alignSelf: 'flex-start',
  },
  logo: {
    width: 250,
    resizeMode: 'contain',
    marginBottom: 35,
  },
  bitcoinYayLogo: {
    marginTop: 10,
    resizeMode: 'contain',
  },
  subtitle: {
    color: '#FFF',
    fontSize: 22,
    textAlign: 'center',
    marginTop: 30,
  },
  description: {
    color: 'white',
    marginTop: 50,
    fontSize: 17,

    maxWidth: 325,
    fontWeight: 'regular',
    marginBottom: 5,
  },
  normalText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '300',
    marginBottom: 20,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },

  buttonContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 20,
  },
  button: {
    backgroundColor: '#F88D39',
    paddingVertical: 15,
    width: '100%',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  footerText: {
    color: '#F88D39',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
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
  orText: {
    color: '#868687',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    width: '100%',
    marginBottom: 15,
  },
  callingCode: {
    fontSize: 16,
    color: '#FFF',
  },
});

export default CreateAccountScreen;
