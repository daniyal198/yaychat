import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';

import {RootStackParamsList} from '../../RootNavigator';
import {StackNavigationProp} from '@react-navigation/stack';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import {
  sendForgotPasswordOtp,
  sendForgotPasswordOtpToPhone,
  sendOtp,
  sendPhoneOtp,
} from '../../services/auth.service';
import {Alert} from 'react-native';
import OvalButton from '../../components/OvalButton';

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamsList,
  'ForgetPassword'
>;

const ForgetPassword: React.FC = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const [emailOrPhone, setEmailOrPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const isEmail = (input: string) => {
    // Simple email regex pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(input);
  };

  const isPhoneNumber = (input: string) => {
    // Simple phone number regex pattern (adjust according to your requirements)
    const phonePattern = /^[0-9]{10,15}$/;
    return phonePattern.test(input.replace(/\D/g, '')); // Remove all non-digit characters
  };

  const handleSubmit = async () => {
    if (!emailOrPhone) {
      Alert.alert('Validation', 'Please enter your email or phone number.');
      return;
    }

    setLoading(true);
    try {
      let response;

      if (isEmail(emailOrPhone)) {
        response = await sendOtp(emailOrPhone, 'Forgot Password');
      } else if (isPhoneNumber(emailOrPhone)) {
        response = await sendPhoneOtp(emailOrPhone);
      } else {
        Alert.alert(
          'Validation',
          'Please enter a valid email or phone number.',
        );
        return;
      }

      console.log('Response:', response);
      if (response?.status === 200) {
        navigation.navigate('VerifyEmail', {
          email: emailOrPhone,
          isPhone: !isEmail(emailOrPhone), // Pass whether it's a phone number
        });
      } else {
        Alert.alert('Error', response?.message || 'Something went wrong');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <Image
          source={require('../../../assets/img/forget_password_bg.png')}
          style={styles.backgroundImage}
        />
      </View>
      <Text style={styles.subtitle}>Forgot your password?</Text>
      <View style={styles.inputContainer}>
        <TextField
          label="Email"
          value={emailOrPhone}
          placeholder="Email"
          onChangeText={setEmailOrPhone}
          multiline={false}
        />
      </View>
      {/* Buttons Wrapper */}
      <View style={styles.buttonContainer}>
        {/* <Button
          title="Submit"
          disabled={loading}
          loading={loading}
          onPress={handleSubmit}

        /> */}

        <OvalButton
          textInsideOval="Submit"
          disabled={loading}
          loading={loading}
          onPress={handleSubmit}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15, // Prevents buttons from touching screen edges
    width: '100%',
    // marginTop: 20,
    backgroundColor: '#000',
    position: 'relative',
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
  logo: {
    width: 250,
  },
  bitcoinYayLogo: {
    marginTop: 10,
  },
  inputContainer: {
    marginTop: 40,
    width: '100%',
  },
  subtitle: {
    color: '#FFF',
    marginTop: 100,
    fontSize: 24,
    maxWidth: 250,
    fontWeight: 500,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  title: {
    color: '#FFF',
    marginTop: 10,
    marginBottom: 70,
    fontSize: 12,
    maxWidth: 350,
    textAlign: 'left',
    fontWeight: '300',
  },
  buttonContainer: {
    width: '100%', // Ensures the container is full width
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%', // Ensures button takes full width of parent container
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 500,
  },
  footer: {
    color: '#F88D39',
    fontSize: 12,
    position: 'absolute',
    bottom: 20,
  },
});

export default ForgetPassword;
