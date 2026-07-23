import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import Button from '../../components/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ProfileIcon from '../../../assets/img/profile_grey.svg';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {colors} from '../../theme/colors';
import {useAuth} from '../../context/AuthContext';
import CustomPopup from '../../components/CustomPopUp';
import SignOutPopUp from '../../components/SignOutPopUp';
import HelpToProtectAccountPopUp from '../../components/HelpToProtectAccountPopUp';
import SelfReportAccountPopUp from '../../components/SelfReportAccountPopUp';
import FileUploadedPopUp from '../../components/FileUploadedPopUp';
import DeleteProfilePopup from './DeleteProfilePopup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteAccount,
  getUserDetails,
  getUserPrivacySettings,
  updateUserPrivacySettings,
} from '../../services/auth.service';
import {decodeJWT} from '../../utils/jwt';
import {Share} from 'react-native';
import OvalButton from '../../components/OvalButton';
import MailAddIcon from '../../../assets/img/message_add_icon.svg';
import PhoneAddIcon from '../../../assets/img/phone_add_icon.png';
const ProfileScreen = () => {
  const navigation = useNavigation();
  const {logout, isLoggedIn} = useAuth();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);

  const [helpProtectAccountModalVisible, setHelpProtectAccountModalVisible] =
    React.useState(false);
  const [selfReportAccountModalVisible, setSelfReportAccountModalVisible] =
    React.useState(false);
  const [fileUploadedModalVisible, setFileUploadedModalVisible] =
    React.useState(false);
  const [deleteProfileModalVisible, setDeleteProfileModalVisible] = useState(false);
  useEffect(() => {
    console.log('isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [privacySettings, setPrivacySettings] = useState({
    hideRealName: false,
    hideBalance: false,
    pushNotifications: false,
  });
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState(null);

  // Function to extract name from email
  const getDisplayName = () => {
    if (userData?.firstName || userData?.lastName) {
      return userData.firstName + ' ' + userData.lastName;
    }
    if (userData?.email) {
      // Return email without domain
      return userData.email.split('@')[0];
    }
    return 'NA';
  };

  // Function to extract username from email
  const getDisplayUserName = () => {
    if (userData?.username) {
      return userData.username;
    }
    return 'Not Available';
  };

  const handleToggle = async (key, val) => {
    try {
      const email = userData?.email;
      if (!email) return;
      setTogglingKey(key);
      console.log(key, val);
      await updateUserPrivacySettings(email, {[key]: val});
      setPrivacySettings(prev => ({...prev, [key]: val}));
      // Emit event if key is hideBalance
      if (key === 'hideBalance') {
        DeviceEventEmitter.emit('updateHideBalance', val);
      }
    } catch (err) {
      console.log('Error updating privacy setting:', err);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setTogglingKey(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            const userObj = decodeJWT(token);
            const response = await getUserDetails(userObj?.email);
            if (response.status === 200) {
              setUserData(response.data);
              const privacyRes = await getUserPrivacySettings(userObj?.email);
              setPrivacySettings(privacyRes?.data || {});
            } else {
              setError('Failed to fetch user data');
            }
          }
        } catch (err) {
          console.log('Error fetching user data:', err);
          setError(err.message);
        } finally {
          setLoading(false);
          setPrivacyLoading(false);
        }
      };

      setLoading(true);
      setPrivacyLoading(true);
      fetchUserData();
    }, []),
  );

  if (loading || privacyLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8728" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const renderSwitch = (label, key, description) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignSelf: 'flex-start',
        width: '100%',
      }}>
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: 20,
            marginBottom: 5,
          }}>
          <Text style={[styles.sectionSubTitle, {fontWeight: 'bold'}]}>
            {label}
          </Text>
          {togglingKey === key ? (
            <ActivityIndicator size="small" color="#FF8728" />
          ) : (
            <Switch
              trackColor={{false: '#767577', true: '#81b0ff'}}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={val => handleToggle(key, val)}
              value={privacySettings[key]}
            />
          )}
        </View>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
  );

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      setModalVisible(true);
      //await logout();
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount(userData?.email);
      await logout();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Delete account error:', error);
    }
  };

  const handlePhoneNumberPress = () => {
    if (userData?.phone) {
      Alert.alert('Your Phone Number', userData.phone, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Change',
          onPress: () =>
            navigation.navigate('AddPhoneNumb', {
              phone: userData.phone,
            }),
        },
      ]);
    } else {
      navigation.navigate('AddPhoneNumb', {
        phone: '', // or just don't pass it if not needed
      });
    }
  };

  const handleEmailPress = () => {
    if (userData?.email) {
      Alert.alert('Your Email Address', userData.email, [
        {text: 'Cancel', style: 'cancel'},
      ]);
    } else {
      navigation.navigate('AddAdditionalEmail', {
        email: '', // or just don't pass it if not needed
      });
    }
  };

  const handleShareReferral = async () => {
    try {
      const message = `Hey! Join Bitcoin Yay and start mining with me. Use my referral link to sign up: https://bitcoinyay/${
        userData?.referralCode || 'Robert90'
      }`;

      await Share.share({
        message,
        title: 'Join Bitcoin Yay!',
      });
    } catch (error) {
      console.log('Error sharing referral code:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'column',
          width: '100%',
          marginBottom: 20,
        }}>
        <View style={styles.avatarContainer}>
          <ProfileIcon />
        </View>
        <Text style={styles.title}> {getDisplayName()}</Text>
        {/* <TouchableOpacity
          onPress={() => navigation.navigate('UpdateProfile')}
          style={[styles.faqButton, {alignSelf: 'center', marginTop: 10}]}>
          <Text style={styles.buttonText}>Update Profile</Text>
        </TouchableOpacity> */}
        <View style={{alignItems: 'center', marginTop: 20, marginBottom: 40}}>
          <OvalButton
            label="Update Profile"
            IconInsideOval={require('../../../assets/img/pen_icon.png')}
            isPng={true}
            onPress={() => {
              navigation.navigate('UpdateProfile');
            }}
          />
        </View>
      </View>
      <Text style={styles.sectionDescription}>
        Correct spelling is needed to claim Bitcoin yay.{'\n'}You have 30 days
        to correct name.
      </Text>
      <Text style={{color: '#D5D5D5', fontSize: 14, fontWeight: 'regular'}}>
        Username:
        <Text style={{fontWeight: 'bold'}}> @{getDisplayUserName()} </Text>
      </Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          alignSelf: 'flex-start',
          width: '100%',
        }}>
        <Text style={{color: '#D5D5D5', fontSize: 14, fontWeight: 'regular'}}>
          Referral link to share:
          <Text style={{fontWeight: 'bold'}}>
            {' '}
            bitcoinyay/{userData?.referralCode}
          </Text>
        </Text>
        <TouchableOpacity onPress={handleShareReferral}>
          <Image source={require('../../../assets/img/share.png')} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionTitle, {marginTop: 30}]}>Settings</Text>
      {/* <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignSelf: 'flex-start',
          width: '100%',
        }}>
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: 20,
              marginBottom: 5,
            }}>
            <Text
              style={[
                styles.sectionSubTitle,
                { fontWeight: 'bold', marginBottom: 0 },
              ]}>
              Hide real name
            </Text>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={async (val) => {
                try {
                  const email = userData?.email;
                  if (!email) return;
                  await updateUserPrivacySettings(email, 'hideRealName', val);
                  setPrivacySettings((prev) => ({ ...prev, hideRealName: val }));
                } catch (err) {
                  Alert.alert('Error', 'Failed to update setting');
                }
              }}
              value={privacySettings?.hideRealName}
            />
          </View>

          <Text style={styles.sectionDescription}>
            Hide my real name from members of my Referral Team
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',

          justifyContent: 'space-between',
          alignSelf: 'flex-start',
          width: '100%',
        }}>
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: 20,
              marginBottom: 5,
            }}>
            <Text style={[styles.sectionSubTitle, { fontWeight: 'bold' }]}>
              Hide Balance
            </Text>

            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={async (val) => {
                try {
                  const email = userData?.email;
                  if (!email) return;
                  await updateUserPrivacySettings(userData?.email, 'hideBalance', val);
                  setPrivacySettings((prev) => ({ ...prev, hideBalance: val }));
                } catch (err) {
                  Alert.alert('Error', 'Failed to update setting');
                }
              }}
              value={privacySettings.hideRealName}
            />
          </View>

          <Text style={styles.sectionDescription}>
            Hide my balance number shown at the top of the app. Hiding the
            balance will not affect your mining rate.
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignSelf: 'flex-start',
          width: '100%',
        }}>
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginTop: 20,
              marginBottom: 5,
            }}>
            <Text
              style={[
                styles.sectionSubTitle,
                { fontWeight: 'bold', marginTop: 5 },
              ]}>
              Push Notifications
            </Text>

            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={async (val) => {
                try {
                  const email = userData?.email;
                  if (!email) return;
                  await updateUserPrivacySettings(userData?.email, 'pushNotifications', val);
                  setPrivacySettings((prev) => ({ ...prev, pushNotifications: val }));
                } catch (err) {
                  Alert.alert('Error', 'Failed to update setting');
                }
              }}
              value={privacySettings.pushNotifications}
            />
          </View>

          <Text style={styles.sectionDescription}>
            In order to disable notifications, you must switch it off.
          </Text>
        </View>
      </View> */}
      {renderSwitch(
        'Hide real name',
        'hideRealName',
        'Hide my real name from members of my Referral Team',
      )}
      {renderSwitch(
        'Hide Balance',
        'hideBalance',
        'Hide my balance number shown at the top of the app. Hiding the balance will not affect your mining rate.',
      )}
      {/* {renderSwitch(
        'Push Notifications',
        'pushNotifications',
        'In order to disable notifications, you must switch it off.',
      )} */}
      <Text style={[styles.sectionTitle, {marginTop: 30}]}>
        Account Verification
      </Text>
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 15}]}>
        Email Address
      </Text>
      <Text style={styles.sectionDescription}>
        Add and verify your email as an additional way to recover your Bitcoin
        Yay account in the future.
      </Text>
      {/* <TouchableOpacity style={styles.faqButton} onPress={handleEmailPress}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>
            {' '}
            {userData?.email ? 'View Email Address' : 'Add Email Address'}
          </Text>
        </View>
      </TouchableOpacity> */}

      <OvalButton
        IconInsideOval={MailAddIcon}
        label={userData?.email ? 'View Email Addres' : 'Add Email Address'}
        onPress={handleEmailPress}
      />
      {/* <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 15}]}>
        Phone Number
      </Text>
      <Text style={styles.sectionDescription}>
        {userData?.phone
          ? 'Your verified phone number is registered with your account.'
          : 'By adding phone number, you have an additional way to recover or access your account.'}
      </Text> */}
      {/* <TouchableOpacity
        style={styles.faqButton}
        onPress={handlePhoneNumberPress}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>
            {userData?.phone ? 'View/Change Phone Number' : 'Add Phone Number'}
          </Text>
        </View>
      </TouchableOpacity> */}
      {/* <View style={{alignItems: 'center', marginTop: 20, marginBottom: 40}}>
        <OvalButton
          IconInsideOval={PhoneAddIcon}
          isPng={true}
          label={
            userData?.phone ? 'View/Change Phone Number' : 'Add Phone Number'
          }
          onPress={handlePhoneNumberPress}
        />
      </View> */}
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 30}]}>
        Report Compromised Account
      </Text>
      <Text style={styles.sectionDescription}>
        Report if you accidentally shared your password or noticed some
        suspicious activity on your account.
      </Text>
      {/* <TouchableOpacity
        style={styles.faqButton}
        onPress={() => setHelpProtectAccountModalVisible(true)}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>Report</Text>
        </View>
      </TouchableOpacity> */}
      <View style={{marginTop: 20, marginBottom: 40}}>
        <OvalButton
          textInsideOval="Report"
          onPress={() => setHelpProtectAccountModalVisible(true)}
        />
      </View>
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 30}]}>
        Self-report This Account as Fake
      </Text>
      <Text style={styles.sectionDescription}>
        Report if this account is a duplicate or fake one
      </Text>
      {/* <TouchableOpacity
        style={styles.faqButton}
        onPress={() => setSelfReportAccountModalVisible(true)}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>Report</Text>
        </View>
      </TouchableOpacity> */}
      <View style={{marginTop: 20, marginBottom: 40}}>
        <OvalButton
          textInsideOval="Report"
          onPress={() => setSelfReportAccountModalVisible(true)}
        />
      </View>
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 30}]}>
        Account Deletion
      </Text>
      <Text style={styles.sectionDescription}>
        Tap the button to how you can delete your account from Bitcoin yay.
      </Text>
      <View style={{marginTop: 20, marginBottom: 40}}>
        <OvalButton
          textInsideOval="Delete"
          onPress={() => setDeleteProfileModalVisible(true)}
        />
      </View>

      <View style={{marginBottom: 55}}>
        {/* <Button title="Sign Out" onPress={() => handleLogout()} /> */}
        <OvalButton textInsideOval="Sign Out" onPress={() => handleLogout()} />
      </View>
      <SignOutPopUp
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      <HelpToProtectAccountPopUp
        visible={helpProtectAccountModalVisible}
        onClose={() => setHelpProtectAccountModalVisible(false)}
      />
      <SelfReportAccountPopUp
        visible={selfReportAccountModalVisible}
        onClose={() => setSelfReportAccountModalVisible(false)}
      />
      <FileUploadedPopUp
        visible={fileUploadedModalVisible}
        onClose={() => setFileUploadedModalVisible(false)}
      />
      <DeleteProfilePopup
        visible={deleteProfileModalVisible}
        onClose={() => setDeleteProfileModalVisible(false)}
        onDelete={handleDeleteAccount}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  menuContainer: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuText: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    color: colors.textPrimary,
  },
  description: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 16,
    color: '#d5d5d5',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 400,
    marginBottom: 16,
    color: '#FF8728',
  },
  sectionWithBg: {
    marginBottom: 24,
    color: '#d5d5d5',
    backgroundColor: '#252525',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',

    color: '#d5d5d5',
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 20,
    marginBottom: 8,
    color: '#d5d5d5',
  },
  sectionDescription: {
    fontSize: 12,
    marginBottom: 16,

    color: '#D5D5D5',
    lineHeight: 20,
  },
  orangeText: {
    color: '#FF8728',
  },
  button: {
    backgroundColor: '#007bff',
    marginBottom: 16,
  },
  faqButton: {
    backgroundColor: '#FF8728',
    padding: 10,
    // width: 65,
    height: 40,
    marginBottom: 10,
    //width: '100%', // Ensures button takes full width of parent container
    borderRadius: 10,
    alignItems: 'center',

    alignSelf: 'flex-start',

    // marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 500,
    fontSize: 12,
  },
});

export default ProfileScreen;
