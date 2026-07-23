import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import {colors} from '../../../theme/colors';
import CountryPicker, {
  DARK_THEME,
  Country,
} from 'react-native-country-picker-modal';
import {useNavigation} from '@react-navigation/native';
import {AuthNavigationProp} from '../../../navigation/types';
import {sendPhoneOtp} from '../../../services/auth.service';
import OvalButton from '../../../components/OvalButton';

const LoginWithPhoneForgetPassword = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const CountryPickerAny: any = CountryPicker;
  const [countryCode, setCountryCode] = useState('US');
  const [callingCode, setCallingCode] = useState('1');
  const [phoneNumber, setPhoneNumber] = useState('');

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  const handleSubmit = async () => {
    const fullPhone = `+${callingCode}${phoneNumber}`;
    if (phoneNumber.length >= 6) {
      try {
        const res = await sendPhoneOtp(fullPhone);
        console.log('OTP Response:', res);
        if (res.status == 200) {
          navigation.navigate('LoginWithPhoneVerifyPhoneNumber', {
            phone: fullPhone,
          });
        } else {
          Alert.alert('Error', res.message || 'Unable to send OTP');
        }
      } catch (error) {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } else {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Forget Password</Text>
        <Text style={styles.subTitle}>Enter the valid phone number</Text>
        <Text style={styles.label}>Country</Text>
        <View style={styles.pickerContainer}>
          <CountryPickerAny
            withFilter
            withFlag
            withCountryNameButton
            countryCode={countryCode}
            onSelect={onSelectCountry}
            theme={DARK_THEME}
          />
        </View>

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneInputContainer}>
          <Text style={styles.callingCode}>+{callingCode}</Text>
          <TextInput
            style={styles.phoneInput}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        {/* <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity> */}
        <OvalButton textInsideOval="Submit" onPress={handleSubmit} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: 10,
    marginTop: 80,
  },
  subTitle: {
    fontSize: 16,

    marginBottom: 25,
    color: '#d5d5d5',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#d5d5d5',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    marginBottom: 24,
  },
  countryButton: {
    flex: 1,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    marginBottom: 32,
  },
  callingCode: {
    color: '#d5d5d5',
    fontSize: 16,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    color: '#d5d5d5',
    fontSize: 16,
    padding: 0,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#d5d5d5',
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
  },
});

export default LoginWithPhoneForgetPassword;
