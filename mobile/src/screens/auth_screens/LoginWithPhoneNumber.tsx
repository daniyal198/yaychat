import {useNavigation} from '@react-navigation/native';
import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import CountryPicker, {DARK_THEME} from 'react-native-country-picker-modal';
import {RootStackParamsList} from '../../RootNavigator';
import {StackNavigationProp} from '@react-navigation/stack';
import OvalButton from '../../components/OvalButton';

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamsList,
  'LoginWithPhone'
>;

const LoginWithPhoneNumber: React.FC = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const CountryPickerAny: any = CountryPicker;
  const [countryCode, setCountryCode] = useState('US'); // Default country
  const [callingCode, setCallingCode] = useState('1'); // Default calling code
  const [phoneNumber, setPhoneNumber] = useState('');

  const onSelectCountry = (country: any) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flexContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Logos */}
          <Image
            style={styles.logo}
            source={require('../../../assets/img/yay_03.png')}
          />
          <Image
            style={styles.bitcoinYayLogo}
            source={require('../../../assets/img/bitcoin.png')}
          />

          {/* Text Content */}
          <Text style={styles.subtitle}>Login with phone number</Text>

          {/* Country Picker */}
          <Text style={[styles.label, {marginTop: 45}]}>Country</Text>
          <View style={styles.pickerContainer}>
            <CountryPickerAny
              withFilter
              withFlag
              withCountryNameButton
              countryCode={countryCode}
              onSelect={onSelectCountry}
              theme={DARK_THEME}
            />
            <Text style={styles.callingCode}>+{callingCode}</Text>
          </View>

          {/* Phone Number Input */}
          <Text style={[styles.label, {marginTop: 25}]}>Phone number</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.callingCodeText}>+{callingCode}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter phone number"
              placeholderTextColor="white"
              keyboardType="phone-pad"
              onChangeText={text => setPhoneNumber(text)}
              value={phoneNumber}
            />
          </View>

          {/* Submit Button */}
          {/* <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('LoginWithPassword')}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity> */}
          <OvalButton
            textInsideOval="Submit"
            onPress={() => navigation.navigate('LoginWithPassword')}
          />

          <Text style={styles.footer}>Terms of Service • Privacy Policy</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    flexShrink: 0,
  },
  container: {
    flex: 1,
    marginTop: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 250,
    resizeMode: 'contain',
  },
  bitcoinYayLogo: {
    marginTop: 10,
    resizeMode: 'contain',
  },
  subtitle: {
    color: '#FFF',
    fontSize: 22,
    textAlign: 'center',
    marginTop: 30,
  },
  label: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#F88D39',
    width: '100%',
    // justifyContent: 'space-between',
  },
  callingCode: {
    fontSize: 16,
    color: '#FFF',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F88D39',
    borderRadius: 5,
    backgroundColor: '#2e2e2e',
    marginTop: 5,
    height: 52,
    width: '100%',
    paddingHorizontal: 10,
  },
  callingCodeText: {
    color: 'white',
    fontSize: 16,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#F88D39',
    paddingVertical: 15,
    width: '100%',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 50,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  footer: {
    color: '#F88D39',
    fontSize: 12,
    position: 'absolute',
    bottom: 20,
  },
});

export default LoginWithPhoneNumber;
