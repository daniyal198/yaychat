//import {useNavigation} from '@react-navigation/native';
//import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import Button from '../../components/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useAuth} from '../../context/AuthContext';
import {registerUser, registerUserWithPhone} from '../../services/auth.service';
import {useUserRegistration} from '../../context/UserRegistrationContext';
import OvalButton from '../../components/OvalButton';
//import {RootStackParamsList} from '../../RootNavigator';

// type StartScreenNavigationProp = StackNavigationProp<
//   RootStackParamsList,
//   'Home'
// >;

const TermsAndConditionScreen = () => {
  const [checked, setChecked] = useState(false);
  const {registrationData} = useUserRegistration();
  const [isLoading, setIsLoading] = useState(false);
  //const navigation = useNavigation<StartScreenNavigationProp>();
  const navigation = useNavigation();
  console.log('checked', checked);
  console.log(registrationData);

  const handleRegister = async () => {
    try {
      setIsLoading(true);

      console.log(registrationData);
      let res;
      // if (registrationData.isLoginWithPhone) {
      //   console.log(' i am here');
      //   res = await registerUserWithPhone({
      //     ...registrationData,
      //     phone: `+${registrationData.callingCode}${registrationData.phoneNumber}`,
      //     referralCode: registrationData.referralCode || undefined, // send empty if not set
      //   });
      // } else {
        res = await registerUser({
          ...registrationData,
          referralCode: registrationData.referralCode || undefined, // send empty if not set
        });
      // }
      console.log('res', res);
      if (res.status === 400) {
        Alert.alert('Error', res.message || 'Registration failed');
      } else if (res.status === 200) {
        // Navigate or show success
        Alert.alert('Success', 'Registration successful!');
        navigation.navigate('Login');
      } else if (res.status === 500) {
        console.log('Register error:', res);
        Alert.alert('Error', res.data || 'Registration failed');
      } else {
        Alert.alert('Error', 'Registration failed');
      }
    } catch (error) {
      console.log('Register error:', error);
      Alert.alert('Error', error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Terms & Conditions</Text>

      <Text style={styles.text}>
        Welcome to Bitcoin yay. By accessing or using Bitcoin yay, you agree to
        comply with these Terms and Conditions. If you do not agree with any
        part of these terms, please discontinue using our services.
        {'\n'}
        To use Bitcoin yay, you must be at least 18 years old or meet the legal
        age requirement in your jurisdiction. You are responsible for providing
        accurate registration details and maintaining the security of your
        account. Any unauthorized access or suspicious activity must be reported
        immediately. Bitcoin yay enables users to mine and utilize Bitcoin yay
        cryptocurrency within its ecosystem. Users are strictly prohibited from
        engaging in fraudulent activities, hacking, or any form of platform
        exploitation. Violations may result in account suspension or
        termination. {'\n'}Mining Bitcoin yay is subject to the platform's rules
        and limitations, and all transactions involving Bitcoin yay are final
        and irreversible. Bitcoin yay is not responsible for any losses
        resulting from unauthorized transactions. The platform must not be used
        for unlawful purposes, including but not limited to money laundering or
        other illegal activities. The collection and use of user data are
        governed by our Privacy Policy. While Bitcoin yay implements security
        measures to protect user information, absolute security cannot be
        guaranteed.
        {'\n'}
        All trademarks, content, and materials on Bitcoin yay are owned by or
        licensed to the platform, and any unauthorized use is strictly
        prohibited. Bitcoin yay is provided on an "as-is" basis, and we are not
        liable for any losses, damages, or technical issues encountered while
        using the service. We reserve the right to modify these Terms and
        Conditions at any time. Continued use of Bitcoin yay after updates
        constitutes acceptance of the revised terms. In the event of a
        violation, Bitcoin yay may suspend or terminate user accounts without
        prior notice. {'\n'}These Terms and Conditions are governed by the laws
        of [Jurisdiction].
      </Text>

      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkboxWrapper}
          onPress={() => setChecked(!checked)}>
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        </TouchableOpacity>
        <Text style={styles.checkboxText}>
          By Creating an account, you agree to the
          <Text
            style={{color: '#F88D39', textDecorationLine: 'underline'}}
            onPress={() => navigation.navigate('TermsofUse')}>
            {' '}
            Term of Service,
          </Text>
          <Text>  </Text>
          <Text
            style={{color: '#F88D39', textDecorationLine: 'underline'}}
            onPress={() => navigation.navigate('UserAgreement')}>
            User Agreement{' '}
          </Text>
          and{' '}
          <Text
            style={{color: '#F88D39', textDecorationLine: 'underline'}}
            onPress={() => navigation.navigate('PrivacyPolicy')}>
            Privacy Policy
          </Text>
        </Text>
      </View>
      {/* <Button
        title="Start"
        onPress={() => handleRegister()}
        style={[styles.button, !checked && styles.buttonDisabled]}
        disabled={!checked || isLoading}
        loading={isLoading}
      /> */}
      <View style={{marginTop: 20}}>
        <OvalButton
          textInsideOval="Start"
          onPress={() => handleRegister()}
          disabled={!checked || isLoading}
          loading={isLoading}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 20,
  },
  logo: {
    //width: 45,
    //height: 45,
    marginRight: 5,
  },
  text: {
    fontSize: 14,
    color: '#D5D5D5',
    marginBottom: 10,
    maxWidth: 350,
    lineHeight: 24,
  },
  checkboxWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#F88D39',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#F88D39',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxText: {
    fontSize: 14,
    color: '#fff',
    width: 300,
  },
  button: {
    backgroundColor: '#F88D39',
    opacity: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

export default TermsAndConditionScreen;
