import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import PasswordTextField from '../../components/PasswordTextField';
import {useNavigation, useRoute} from '@react-navigation/native';
import Button from '../../components/Button';
import {
  resetPassword,
  resetPasswordWithPhone,
} from '../../services/auth.service';
import OvalButton from '../../components/OvalButton';
import ResetPasswordIcon from '../../../assets/img/resetPasswordIcon.svg';

const ResetPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const email = route.params?.email || '';
  const phone = route.params?.phone || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validatePassword = () => {
    let isValid = true;

    if (!newPassword) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    } else {
      setPasswordError('');
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    } else {
      setConfirmPasswordError('');
    }

    console.log('isValid:', isValid);

    return isValid;
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    try {
      let response = null;
      if (email) {
        response = await resetPassword(email, newPassword);
      } else if (phone) {
        response = await resetPasswordWithPhone(phone, newPassword);
      }

      console.log('Reset password response:', response);
      if (response.status === 200) {
        Alert.alert('Success', 'Password reset successfully', [
          {text: 'OK', onPress: () => navigation.navigate('Login')},
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to reset password');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'An error occurred. Please try again.',
      );
    } finally {
      setLoading(false);
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
            {/* Background Image   */}
            <View style={styles.backgroundImageContainer}>
              <Image
                source={require('../../../assets/img/whoInvitedYou.png')}
                style={styles.backgroundImage}
              />
            </View>

            <Text style={styles.subtitle}>Reset Password</Text>
            <Text style={styles.description}>
              Please enter strong password mixer of words, digits and symbols.
            </Text>

            {/* Email Fields */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password:</Text>
              <PasswordTextField
                label="Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                error={passwordError}
              />
              <Text style={[styles.label, {marginTop: 20}]}>
                Confirm Password
              </Text>
              <PasswordTextField
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                error={confirmPasswordError}
              />
              {confirmPasswordError ? (
                <Text style={styles.errorText}>{confirmPasswordError}</Text>
              ) : null}
            </View>

            {/* Button */}
            {/* <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('CreateAccount')}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity> */}
            <View style={styles.buttonContainer}>
              {/* <Button
                title="Reset Password"
                onPress={handleResetPassword}
                disabled={loading}
                loading={loading}
              /> */}
              <OvalButton
                label="Reset Password"
                IconInsideOval={ResetPasswordIcon}
                onPress={handleResetPassword}
                disabled={loading}
                loading={loading}
              />
            </View>
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
    paddingHorizontal: 20,
    backgroundColor: '#000',
    width: '100%',
    position: 'relative',
  },
  backgroundImageContainer: {
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
    opacity: 0.06,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'left',
    color: 'white',
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
    marginTop: 100,
    fontSize: 24,
    alignSelf: 'flex-start',
    fontWeight: 500,
  },
  description: {
    color: 'grey',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'left',
    maxWidth: 325,
    fontWeight: 'regular',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 50,
    width: '100%',
  },
  footerText: {
    color: '#B6B6B6',
    textAlign: 'left',
    marginTop: 40,
    fontSize: 12,
    maxWidth: 300,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
});

export default ResetPasswordScreen;
