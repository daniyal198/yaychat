import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import CountryPicker, {
  DARK_THEME,
  Country,
  FlagType,
} from 'react-native-country-picker-modal';
import { colors } from '../../theme/colors';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Gopher from '../../../assets/splash/phone_mask.svg';
import { addPhoneNumber, checkByphone } from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../../utils/jwt';
import { getAllCountries } from 'react-native-country-picker-modal';

type AddPhoneNumbRouteParams = {
  AddPhoneNumb: {
    phone?: string;
  };
};

const AddPhoneNumb = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AddPhoneNumbRouteParams, 'AddPhoneNumb'>>();
  const [isLoading, setIsLoading] = useState(false);
  const CountryPickerAny: any = CountryPicker;

  const [countryCode, setCountryCode] = useState<'US' | string>('US');
  const [callingCode, setCallingCode] = useState('1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const getCountryCodeByCallingCode = async (code: string): Promise<string> => {
    const countries = await getAllCountries(FlagType.EMOJI); // required argument
    const match = countries.find(c => c.callingCode.includes(code));
    return match?.cca2 || 'US';
  };
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    const checkPhoneAvailability = async () => {
      const fullPhone = `+${callingCode}${phoneNumber}`;

      if (phoneNumber.length >= 6) {
        const res = await checkByphone(fullPhone);
        console.log('Phone availability check response:', res);
        if (res.status === 200 && !res.success) {
          setPhoneError('Phone number already in use. Please use another one.');
        } else {
          setPhoneError('');
        }
      } else {
        setPhoneError('');
      }
    };

    checkPhoneAvailability();
  }, [phoneNumber, callingCode]);

  useEffect(() => {
    const initPhoneData = async () => {
      const fullPhone = route.params?.phone || '';
      if (fullPhone.startsWith('+') && fullPhone.length > 5) {
        const extractedCallingCode = fullPhone.slice(1, fullPhone.length - 10);
        const extractedPhone = fullPhone.slice(-10);
        const matchedCountryCode = await getCountryCodeByCallingCode(extractedCallingCode);

        setCallingCode(extractedCallingCode);
        setPhoneNumber(extractedPhone);
        setCountryCode(matchedCountryCode);
      }
    };

    initPhoneData(); // run async initializer
  }, [route.params]);


  const handleSubmit = async () => {
    if (phoneError) {
      Alert.alert('Error', phoneError);
      return;
    }

    // Basic validation
    if (phoneNumber.length < 6) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number');
      return;
    }
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
    const fullPhoneNumber = `+${callingCode}${phoneNumber}`;

    try {
      setIsLoading(true);
      console.log('Adding phone number:', fullPhoneNumber);
      console.log('User email:', email);
      const response = await addPhoneNumber(email, fullPhoneNumber);
      console.log('Response:', response);
      if (response.status === 200) {
        Alert.alert(
          'Success',
          'Phone number added successfully',
          [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        throw new Error(response.message || 'Failed to add phone number');
      }
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert(
        'Error',
        error.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Phone Number</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          By adding a phone number, you'll have an additional way to recover or
          access your account.
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country</Text>
            <View style={styles.pickerContainer}>
              <CountryPickerAny
                withFilter
                withFlag
                withCountryNameButton
                countryCode={countryCode}
                onSelect={onSelectCountry}
                theme={DARK_THEME}
                containerButtonStyle={styles.countryPickerButton}
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
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
            {!!phoneError && <Text style={{ color: 'red' }}>{phoneError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.button, (isLoading || phoneError) && styles.buttonDisabled,]}
            onPress={handleSubmit}
            disabled={isLoading || phoneError !== ''}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>Add Phone Number</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Gopher style={styles.gopherImage} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    marginTop: 35,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: colors.textPrimary,
    fontSize: 24,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: -24, // Adjust for back button
  },
  content: {
    padding: 16,
    flex: 1,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
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
  countryPickerButton: {
    flex: 1,
    justifyContent: 'flex-start',
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
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    padding: 0,
  },
  formContainer: {
    gap: 4,
    marginTop: 20,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  gopherImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: -1,
  },
});

export default AddPhoneNumb;