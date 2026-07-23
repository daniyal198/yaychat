import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {colors} from '../../../theme/colors';
import PasswordTextField from '../../../components/PasswordTextField';
import {useNavigation} from '@react-navigation/native';
import {AuthNavigationProp} from '../../../navigation/types';
import Button from '../../../components/Button';

import {RouteProp, useRoute} from '@react-navigation/native';
import {RootStackParamsList} from '../../../RootNavigator';
import {useUserRegistration} from '../../../context/UserRegistrationContext';
import OvalButton from '../../../components/OvalButton';

const VerifyPassword = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const {registrationData, setRegistrationData} = useUserRegistration();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({
    passwordMatch: '',
    passwordStrength: '',
  });

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

  const handleSubmit = () => {
    console.log('registrationData', registrationData);
    if (password === confirmPassword && password.length >= 8) {
      setRegistrationData({
        ...registrationData,
        password,
        confirmPassword,
      });

      navigation.navigate('SetupYourAccount');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.title}>Verify Your Password</Text>
          <Text style={styles.description}>
            Please enter strong password mixer of words, digits and symbols must
            contain 8 characters
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Password</Text>
            <PasswordTextField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
            />
            {errors.passwordStrength ? (
              <Text style={styles.errorText}>{errors.passwordStrength}</Text>
            ) : null}
            <Text style={styles.label}>Confirm Password</Text>
            <PasswordTextField
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
            />
            {errors.passwordMatch ? (
              <Text style={styles.errorText}>{errors.passwordMatch}</Text>
            ) : null}
          </View>
          {/* 
          <Button
            title="Submit"
            onPress={handleSubmit}
            disabled={
              !!errors.passwordMatch ||
              !!errors.passwordStrength ||
              !password ||
              !confirmPassword ||
              confirmPassword !== password
            }
          /> */}
          <OvalButton
            textInsideOval="Submit"
            onPress={handleSubmit}
            disabled={
              !!errors.passwordMatch ||
              !!errors.passwordStrength ||
              !password ||
              !confirmPassword ||
              confirmPassword !== password
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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 20,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
});

export default VerifyPassword;
