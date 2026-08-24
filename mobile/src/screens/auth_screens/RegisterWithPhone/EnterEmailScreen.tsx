import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import TextField from '../../../components/TextField';
import {useNavigation} from '@react-navigation/native';
import {AuthNavigationProp} from '../../../navigation/types';
import {useUserRegistration} from '../../../context/UserRegistrationContext';
import {checkEmail} from '../../../services/auth.service';
import OvalButton from '../../../components/OvalButton';

const EnterEmailScreen = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const {registrationData, setRegistrationData} = useUserRegistration();
  const [errors, setErrors] = useState({
    email: '',
    emailUsed: '',
  });

  const handleNext = () => {
    const emailMismatch =
      confirmEmail.length > 0 && confirmEmail !== email
        ? 'Emails do not match'
        : '';

    if (!errors.email && !errors.emailUsed && !emailMismatch) {
      setRegistrationData({
        ...registrationData,
        email,
      });
      navigation.navigate('VerifyPassword');
    } else {
      setErrors(prev => ({...prev, email: emailMismatch}));
    }
  };
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setErrors(prev => ({
      ...prev,
      email:
        email.length && !emailRegex.test(email) ? 'Invalid email format' : '',
    }));
  }, [email]);

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
          setErrors(prev => ({...prev, emailUsed: ''}));
        }
      }
    };
    checkAvailability();
  }, [email]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.title}>Enter Your Email</Text>
          <Text style={styles.description}>
            Enter a valid email address. You will be asked to verify the address
            after registration.
          </Text>

          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              multiline={false}
              //keyboardType="email-address"
              //autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
            {errors.emailUsed ? (
              <Text style={styles.errorText}>{errors.emailUsed}</Text>
            ) : null}

            <TextField
              label="Confirm Email"
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              placeholder="Confirm your email"
              multiline={false}
              //keyboardType="email-address"
              //autoCapitalize="none"
            />
            {confirmEmail.length > 0 && confirmEmail !== email ? (
              <Text style={styles.errorText}>Emails do not match</Text>
            ) : null}
          </View>

          {/* <Button
            title="Next"
            onPress={handleNext}
            disabled={
              !!errors.email ||
              !!errors.emailUsed ||
              !email ||
              !confirmEmail ||
              email !== confirmEmail
            }
          /> */}
          <OvalButton
            textInsideOval="Next"
            onPress={handleNext}
            disabled={
              !!errors.email ||
              !!errors.emailUsed ||
              !email ||
              !confirmEmail ||
              email !== confirmEmail
            }
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#d5d5d5',
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    gap: 10,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
});

export default EnterEmailScreen;
