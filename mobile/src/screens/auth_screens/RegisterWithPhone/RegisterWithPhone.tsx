import React, { useEffect, useState } from 'react';
import {StyleSheet, View, Text, TextInput, SafeAreaView, Alert} from 'react-native';
import { colors } from '../../../theme/colors';
import CountryPicker, {
  DARK_THEME,
  Country,
} from 'react-native-country-picker-modal';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamsList } from '../../../RootNavigator';
import { useUserRegistration } from '../../../context/UserRegistrationContext';
import { checkByphone } from '../../../services/auth.service';
import OvalButton from '../../../components/OvalButton';

type RegisterWithPhoneScreenProp = StackNavigationProp<
  RootStackParamsList,
  'RegisterWithPhone'
>;

const RegisterWithPhone = () => {
  const navigation = useNavigation<RegisterWithPhoneScreenProp>();
  const CountryPickerAny: any = CountryPicker;
  const [countryCode, setCountryCode] = useState('US');
  const [callingCode, setCallingCode] = useState('1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { setRegistrationData } = useUserRegistration();
  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    const checkPhoneAvailability = async () => {
      const fullPhone = `+${callingCode}${phoneNumber}`;

      if (phoneNumber.length >= 6) {
        const res = await checkByphone(fullPhone);

        if (res.status === 200 && !res.success) {
          setPhoneError('Phone number already in use');
        } else {
          setPhoneError('');
        }
      } else {
        setPhoneError('');
      }
    };

    checkPhoneAvailability();
  }, [phoneNumber, callingCode]);

  const handleSubmit = () => {
    if (phoneError) {
      Alert.alert('Error', phoneError);
      return;
    }
    if (phoneNumber.length >= 6) {
      // ✅ Save to context
      setRegistrationData({
        phoneNumber,
        callingCode,
        countryCode,
        isLoginWithPhone: true,
      });

      navigation.navigate('EnterEmail', {
        phoneNumber,
        callingCode,
        countryCode,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Register With Phone Number</Text>

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
        {!!phoneError && (
          <Text style={{ color: 'red', marginTop: 5 }}>{phoneError}</Text>
        )}

        {/* 
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity> */}

        <OvalButton textInsideOval="Submit" onPress={handleSubmit} disabled={!!phoneError} />

        <View style={styles.footer}>
          <Text
            style={styles.footerText}
            onPress={() => navigation.navigate('Login')}>
            Already have an account? <Text style={styles.loginLink}>Login</Text>
          </Text>
        </View>
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
    marginBottom: 32,
    marginTop: 80,
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

export default RegisterWithPhone;
