import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import TextField from '../../../components/TextField';
import { colors } from '../../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../../../navigation/types';
import { useUserRegistration } from '../../../context/UserRegistrationContext';
import { checkUsername } from '../../../services/auth.service';
import OvalButton from '../../../components/OvalButton';

const SetupYourAccount = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const { registrationData, setRegistrationData } = useUserRegistration();
  const [errors, setErrors] = useState({
    username: '',
  });

  useEffect(() => {
    const checkUsernameAvailability = async () => {
      const usernameRegex = /^[A-Za-z0-9]{4,20}$/;

      if (!usernameRegex.test(username)) {
        setErrors(prev => ({
          ...prev,
          username:
            'Username must be 4-20 characters, only letters and numbers allowed',
        }));
        return;
      }

      // Check if the username is already taken
      const res = await checkUsername(username);
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
    };

    // Debounce check
    const debounceTimer = setTimeout(() => {
      if (username) {
        checkUsernameAvailability();
      } else {
        setErrors(prev => ({
          ...prev,
          username: '',
        }));
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [username]);



  const handleSubmit = () => {
    // Add validation logic here
    if (firstName && lastName && username) {
      // Handle registration completion
      console.log('registrationData', registrationData);
      setRegistrationData({
        ...registrationData,
        firstName,
        lastName,
        username,
      });

      navigation.navigate('WhoInvitedYou');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.title}>Setup Your Account</Text>
          <Text style={styles.description}>
            You need to use your real name to be able claim Bitcoin Yay.
          </Text>

          <View style={styles.form}>
            <TextField
              label="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              multiline={false}
            />

            <TextField
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              multiline={false}
            />

            <View>
              <TextField
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                multiline={false}
              />
              <Text style={styles.helperText}>
                Username must be 4 to 20 characters, only number and letters
              </Text>
              {errors.username ? (
                <Text style={styles.errorText}>{errors.username}</Text>
              ) : null}
            </View>
          </View>

          {/* <Button title="Submit" onPress={handleSubmit} disabled={
            !!errors.username ||
            !username ||
            !lastName ||
            !firstName
          } /> */}
          <OvalButton
            textInsideOval="Submit"
            onPress={handleSubmit}
            disabled={!!errors.username || !username || !lastName || !firstName}
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
    marginBottom: 20,
  },
  helperText: {
    fontSize: 14,
    color: '#d5d5d5',
    marginTop: 4,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
});

export default SetupYourAccount;
