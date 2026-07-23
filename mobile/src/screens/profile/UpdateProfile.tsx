import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../theme/colors';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import ProfileIcon from '../../../assets/img/profile_grey.svg';
import TextField from '../../components/TextField';
import PasswordTextField from '../../components/PasswordTextField';
import {
  changePassword,
  checkUsername,
  getUserDetails,
  updateProfile,
} from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../../utils/jwt';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import OvalButton from '../../components/OvalButton';
import UpdateIcon from '../../../assets/img/update_profile.png';
import UpdatePasswordIcon from '../../../assets/img/update_password.png';
type ProfileTabParamList = {
  Profile: undefined;
  UpdateProfile: undefined;
};

type NavigationProp = CompositeNavigationProp<
  StackNavigationProp<ProfileTabParamList, 'UpdateProfile'>,
  BottomTabNavigationProp<any>
>;

const UpdateProfile = () => {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('General Info');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry] = useState('');
  const [personalIdNumber, setPersonalIdNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [errors, setErrors] = useState({
    username: '',
    passwordMatch: '',
    passwordStrength: '',
  });
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userObj = decodeJWT(token);
          const response = await getUserDetails(userObj?.email);
          console.log('userObj:', response.data);
          if (response.status === 200) {
            setUserData(response.data);
            // Set initial form values from API response
            setFirstName(response.data.firstName || '');
            setLastName(response.data.lastName || '');
            setUsername(response.data.username || '');
            setCountry(response.data.country || '');
            setPersonalIdNumber(response.data.personalIdNumber || '');
            setReferralCode(response.data.referralCode || '');
          }
        }
      } catch (err) {
        console.log('Error fetching user data:', err);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchUserData();
  }, []);

  const handleUpdatePassword = async () => {
    let email;
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      const userObj = decodeJWT(token);
      console.log('userObj:', userObj);
      email = userObj.email;
    } else {
      Alert.alert('Error', 'Please login to add phone number');
      return;
    }

    if (!newPassword || !confirmPassword || !currentPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    try {
      setIsLoading(true);

      const response = await changePassword(
        email,
        newPassword,
        currentPassword,
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Password changed successfully', [
          {
            text: 'OK',
            onPress: () => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              navigation.goBack();
            },
          },
        ]);
      } else if (response.status === 500) {
        Alert.alert('Error', response.data);
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to change password. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDetails = async () => {
    let email;
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      const userObj = decodeJWT(token);
      console.log('userObj:', userObj);
      email = userObj.email;
    } else {
      Alert.alert('Error', 'Please login to add phone number');
      return;
    }
    if (!firstName || !lastName || !username) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (username.length < 4 || username.length > 20) {
      Alert.alert('Error', 'Username must be between 4-20 characters');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    try {
      setProfileLoading(true);

      const updateData = {
        firstname: firstName,
        lastname: lastName,
        username: username,
      };

      const response = await updateProfile(email, updateData);

      if (response.status === 200) {
        Alert.alert('Success', 'Profile updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]);
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to update profile. Please try again.',
      );
    } finally {
      setProfileLoading(false);
    }
  };

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


  useEffect(() => {
    const passwordStrengthRegex =
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+]{8,}$/;
    setErrors(prev => ({
      ...prev,
      passwordStrength:
        newPassword && !passwordStrengthRegex.test(newPassword)
          ? 'Password must be at least 8 characters with letters and numbers'
          : '',
    }));
  }, [newPassword]);

  useEffect(() => {
    setErrors(prev => ({
      ...prev,
      passwordMatch:
        newPassword && confirmPassword && newPassword !== confirmPassword
          ? 'Passwords do not match'
          : '',
    }));
  }, [newPassword, confirmPassword]);

  const isFormValid =
    confirmPassword &&
    newPassword &&
    currentPassword &&
    !errors.passwordMatch &&
    !errors.passwordStrength;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab]}
          onPress={() => setActiveTab('General Info')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'General Info' && styles.activeTabText,
            ]}>
            General Info
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab]}
          onPress={() => setActiveTab('Change Password')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'Change Password' && styles.activeTabText,
            ]}>
            Change Password
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'General Info' ? (
        <View style={styles.formContainer}>
          <View style={styles.profileContainer}>
            <View style={styles.avatarContainer}>
              <ProfileIcon />
            </View>
            <Text style={styles.userName}>
              {firstName} {lastName}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            Correct spelling is needed to claim Bitcoin yay.{'\n'}You have 30 days to correct name.
          </Text>
          <Text
            style={{
              color: '#D5D5D5',
              fontSize: 14,
              fontWeight: 'regular',
            }}>
            Username:
            <Text style={{ fontWeight: 'bold' }}>@{username || 'Not Available'}</Text>
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              alignSelf: 'flex-start',
              width: '100%',
            }}>
            <Text
              style={{
                color: '#D5D5D5',
                fontSize: 14,
                fontWeight: 'regular',

                marginVertical: 8,
              }}>
              Invitation cpde to share:
              <Text style={{ fontWeight: 'bold' }}>{referralCode}</Text>
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              alignSelf: 'flex-start',
              width: '100%',
            }}>
            <Text
              style={{
                color: '#D5D5D5',
                fontSize: 14,
                fontWeight: 'regular',
                marginBottom: 20,
              }}>
              Referral link to share:
              <Text style={{ fontWeight: 'bold' }}>
                {' '}
                bitcoinyey/{referralCode}
              </Text>
            </Text>
          </View>
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

          <Text style={styles.helperText}>
            Username must be 4 to 20 characters, only number and letters
          </Text>
          {errors.username ? (
            <Text style={styles.errorText}>{errors.username}</Text>
          ) : null}
          {/* <TouchableOpacity
            style={[
              styles.button,
              (profileLoading || errors.username) && styles.buttonDisabled,
            ]}
            onPress={handleUpdateDetails}
            disabled={profileLoading || !!errors.username}>
            {profileLoading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Update Details</Text>
            )}
          </TouchableOpacity> */}
          <OvalButton isPng={true} textInsideOval="Update Details" IconInsideOval={UpdateIcon} loading={profileLoading} onPress={handleUpdateDetails} disabled={profileLoading || !!errors.username} />
        </View>
      ) : (
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.heading}>Current Password</Text>
            <Text style={styles.label}>Password</Text>
            <PasswordTextField
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Password"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.heading}>New Password</Text>
            <Text style={styles.label}>New Password</Text>
            <PasswordTextField
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Password"
            />
            <Text style={[styles.label, { marginTop: 20 }]}>
              Confirm New Password
            </Text>
            <PasswordTextField
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
            />
          </View>
          {errors.passwordMatch ? (
            <Text style={styles.errorText}>{errors.passwordMatch}</Text>
          ) : null}
          {/* <TouchableOpacity
            style={[
              styles.button,
              (!isFormValid || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleUpdatePassword}
            disabled={!isFormValid || isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </TouchableOpacity>   */}
          <OvalButton isPng={true} label="Update Password" IconInsideOval={UpdatePasswordIcon} loading={isLoading} onPress={handleUpdatePassword} disabled={!isFormValid || isLoading} />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 20,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  balanceText: {
    color: colors.textSecondary,
    fontSize: 24,
    fontWeight: '500',
  },
  yayIcon: {
    width: 20,
    height: 20,
    marginLeft: 5,
  },
  faqText: {
    color: colors.primary,
    fontSize: 16,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 10,
    marginVertical: 24,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  activeTabText: {
    color: colors.primary,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 1,
    borderColor: '#b7b7b7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 12,
    marginBottom: 16,

    color: '#D5D5D5',
    lineHeight: 20,
  },
  userName: {
    color: '#d5d5d5',
    fontSize: 24,
    fontWeight: '600',
  },
  referralText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 20,
  },
  referralCode: {
    color: colors.primary,
  },
  formContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  textInput: {
    color: colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: -8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default UpdateProfile;
