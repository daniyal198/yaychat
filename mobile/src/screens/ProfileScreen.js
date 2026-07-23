import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Button from '../components/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../context/AuthContext';
import {useNavigation} from '@react-navigation/native';
import {getUserDetails} from '../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Share} from 'react-native';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const {logout, isLoggedIn} = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to extract username from email
  const getDisplayName = () => {
    if (userData?.username) {
      return userData.username;
    }
    if (userData?.email) {
      // Return email without domain
      return userData.email.split('@')[0];
    }
    return 'NA';
  };

  const handleShareReferral = async () => {
    try {
      const message = `Hey! Join Bitcoin yay and start mining with me. Use my referral link to sign up: https://bitcoinyay.com/referral=${
        userData?.referralCode || 'Robert90'
      }`;

      await Share.share({
        message,
        title: 'Join Bitcoin yay!',
      });
    } catch (error) {
      console.log('Error sharing referral code:', error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userObj = decodeJWT(token);
          const response = await getUserDetails(userObj?.email);
          console.log('User data response:k', response);
          if (response.status === 200) {
            setUserData(response.data);
          } else {
            setError('Failed to fetch user data');
          }
        }
      } catch (err) {
        console.log('Error fetching user data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
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

  useEffect(() => {
    console.log('isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);
  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      await logout();
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'column',
          width: '100%',
          marginTop: 50,
          marginBottom: 20,
        }}>
        <Image source={require('../../../assets/img/profile.png')} />
        <Text style={styles.title}>{getDisplayName()}</Text>
        <TouchableOpacity
          style={[styles.faqButton, {alignSelf: 'center', marginTop: 10}]}>
          <Text style={styles.buttonText}>Update Profile</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionDescription}>
        {userData?.verification?.emailVerified
          ? 'Your email is verified'
          : 'Please verify your email address'}
      </Text>

      <Text style={styles.sectionDescription}>
        Correct spelling is needed to claim Bitcoin yay.{'\n'}You have 30 days
        and 08:45:03 to correct name.
      </Text>
      <Text style={{color: '#D5D5D5', fontSize: 14, fontWeight: 'regular'}}>
        Username:
        <Text style={{fontWeight: 'bold'}}> @{getDisplayName()} </Text>
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
            bitcoinyey/{userData?.referralCode || 'Robert90'}
          </Text>
        </Text>
        <TouchableOpacity onPress={handleShareReferral}>
          <Image source={require('../../../assets/img/share.png')} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionTitle, {marginTop: 30}]}>Settings</Text>
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
                {fontWeight: 'bold', marginBottom: 0},
              ]}>
              Hide real name
            </Text>
            <Switch
              trackColor={{false: '#767577', true: '#81b0ff'}}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              // onValueChange={}
              value={false}
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
            <Text style={[styles.sectionSubTitle, {fontWeight: 'bold'}]}>
              Hide Balance
            </Text>

            <Switch
              trackColor={{false: '#767577', true: '#81b0ff'}}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              // onValueChange={}
              value={false}
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
                {fontWeight: 'bold', marginTop: 5},
              ]}>
              Push Notifications
            </Text>

            <Switch
              trackColor={{false: '#767577', true: '#81b0ff'}}
              thumbColor={'#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              // onValueChange={}
              value={false}
            />
          </View>

          <Text style={styles.sectionDescription}>
            In order to disable notifications, you must switch it off.
          </Text>
        </View>
      </View>
      <Text style={[styles.sectionTitle, {marginTop: 30}]}>
        Account Verification
      </Text>
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 15}]}>
        Email Address
      </Text>
      <Text style={styles.sectionDescription}>
        Add and verify your email as an additional way to recover your Bitcoin
        Yey account in the future.
      </Text>
      <TouchableOpacity style={styles.faqButton}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>Add Additional Email</Text>
        </View>
      </TouchableOpacity>
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 30}]}>
        Report Compromised Account
      </Text>
      <Text style={styles.sectionDescription}>
        Report if you accidentally shared your password or noticed some
        suspicious activity on your account.
      </Text>
      <TouchableOpacity style={styles.faqButton}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>Report</Text>
        </View>
      </TouchableOpacity>
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 30}]}>
        Self-report This Account as Fake
      </Text>
      <Text style={styles.sectionDescription}>
        Report if this account is a duplicate or fake one
      </Text>
      <TouchableOpacity style={styles.faqButton}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>Report</Text>
        </View>
      </TouchableOpacity>
      <Text
        style={[styles.sectionSubTitle, {fontWeight: 'bold', marginTop: 30}]}>
        Account Deletion
      </Text>
      <Text style={styles.sectionDescription}>
        Tap the button to how you can delete your account from Bitcoin yay.
      </Text>
      <TouchableOpacity style={[styles.faqButton, {marginBottom: 30}]}>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.buttonText}>See How it's work</Text>
        </View>
      </TouchableOpacity>
      <View style={{marginBottom: 15}}>
        <Button title="Sign Out" onPress={() => handleLogout()} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
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
