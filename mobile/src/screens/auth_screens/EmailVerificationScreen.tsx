import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Alert,
} from 'react-native';
//import TextField from '../../components/TextField';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {RootStackParamsList} from '../../RootNavigator';
import {StackNavigationProp} from '@react-navigation/stack';
import {
  CodeField,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import {resendEmailCode, validateOtp} from '../../services/auth.service';
import OvalButton from '../../components/OvalButton';

const CELL_COUNT = 6;

type EmailVerificationRouteProp = RouteProp<RootStackParamsList, 'VerifyEmail'>;

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamsList,
  'VerifyEmail'
>;

const EmailVerificationScreen = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const route = useRoute<EmailVerificationRouteProp>();
  // Get parameters with defaults
  const {
    email = 'your email',
    isPhone = false,
    userType,
  } = route.params || {};
  const verificationType: 'email' | 'phone' =
    route.params?.verificationType ?? (isPhone ? 'phone' : 'email');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useBlurOnFulfill({value: code, cellCount: CELL_COUNT});
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: code,
    setValue: setCode,
  });

  // Dynamic text based on verification type
  const verificationTitle =
    verificationType === 'phone'
      ? 'Verify your Phone Number'
      : 'Verify your Email';

  const verificationDescription =
    verificationType === 'phone'
      ? 'Please enter the 6-digit code sent to'
      : 'Please enter the 6-digit code sent to';

  const handleVerify = async () => {
    if (code.length !== CELL_COUNT) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      console.log('userType', userType);
      if (userType === 'NewRegister') {
        // Call your OTP validation API
        const response = await validateOtp(email, code);

        console.log('Response:', response);
        if (response.status === 200) {
          // Check where the user came from
          const prevRoute =
            navigation.getState().routes[navigation.getState().index - 1];

          if (prevRoute && prevRoute.name === 'ForgetPassword') {
            navigation.navigate('ResetPassword', {email});
          } else {
            navigation.navigate('WhoInvitedYou');
          }
        } else {
          Alert.alert('Error', response.message || 'Invalid verification code');
        }
      } else {
        // Call your OTP validation API
        const response = await validateOtp(email, code);

        console.log('Response:', response);
        if (response.status === 200) {
          // Check where the user came from
          const prevRoute =
            navigation.getState().routes[navigation.getState().index - 1];

          if (prevRoute && prevRoute.name === 'ForgetPassword') {
            navigation.navigate('ResetPassword', {email});
          } else {
            navigation.navigate('WhoInvitedYou');
          }
        } else {
          Alert.alert('Error', response.message || 'Invalid verification code');
        }
      }
    } catch (error: any) {
      console.log('Error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to verify code. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const prevRoute =
        navigation.getState().routes[navigation.getState().index - 1];
      let type =
        prevRoute.name === 'ForgetPassword'
          ? 'Forgot Password'
          : 'New Register';
      await resendEmailCode(email, type);
      Alert.alert('Success', 'A new verification code has been sent');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend code. Please try again.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Background Image */}
            <View style={styles.backgroundContainer}>
              <Image
                source={require('../../../assets/img/forget_password_bg.png')}
                style={styles.backgroundImage}
              />
            </View>
            {/* Text Content */}
            <Text style={styles.subtitle}>{verificationTitle}</Text>
            <Text style={styles.description}>{verificationDescription}</Text>
            <Text
              style={{
                color: '#FFF',
                alignSelf: 'flex-start',
                marginBottom: 20,
                fontSize: 16,
              }}>
              {email}
            </Text>
            <CodeField
              ref={ref}
              {...props}
              value={code}
              onChangeText={setCode}
              cellCount={CELL_COUNT}
              rootStyle={styles.codeFieldRoot}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              renderCell={({index, symbol, isFocused}) => (
                <View
                  key={index}
                  style={[styles.cell, isFocused && styles.focusCell]}
                  onLayout={getCellOnLayoutHandler(index)}>
                  <Text style={styles.cellText}>{symbol || ' '}</Text>
                </View>
              )}
            />

            <View style={styles.buttonContainer}>
              {/* <Button
                title={'Verify'}
                onPress={handleVerify}
                disabled={loading || code.length !== CELL_COUNT}
                loading={loading}
              /> */}
              <OvalButton
                textInsideOval="Send"
                onPress={handleVerify}
                disabled={loading || code.length !== CELL_COUNT}
                loading={loading}
              />
            </View>

            {/* Resend Code Option */}
            <Text style={styles.resendText}>
              Didn't receive code?{' '}
              <Text style={styles.resendLink} onPress={handleResendCode}>
                Resend
              </Text>
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    // justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#000',
    paddingVertical: 20,
    width: '100%',
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  logo: {
    width: 250,
    resizeMode: 'contain',
  },
  bitcoinYayLogo: {
    marginTop: 10,
  },

  subtitle: {
    color: '#FFF',
    marginTop: 40,
    fontSize: 24,
    fontWeight: 500,
    alignSelf: 'flex-start',
  },
  description: {
    color: 'grey',
    marginTop: 15,
    fontSize: 16,
    alignSelf: 'flex-start',
    maxWidth: 325,
    fontWeight: 400,
    //  marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
  },
  buttonContainer: {
    marginTop: 50,
    width: '100%',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  codeFieldRoot: {
    width: '100%',
    marginTop: 10,
  },
  cell: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#2F2F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusCell: {
    borderBottomColor: '#fff',
  },
  cellText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  footerText: {
    color: '#B6B6B6',
    textAlign: 'left',
    marginTop: 40,
    fontSize: 12,
    maxWidth: 300,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resendText: {
    color: 'grey',
    marginTop: 20,
    fontSize: 14,
  },
  resendLink: {
    color: '#F88D39',
    fontWeight: 'bold',
  },
});

export default EmailVerificationScreen;
