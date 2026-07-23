import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import TextField from '../../components/TextField';
import {useNavigation} from '@react-navigation/native';
import Button from '../../components/Button';
import CountryPicker, {DARK_THEME} from 'react-native-country-picker-modal';
import {contactUs} from '../../services/auth.service';
import OvalButton from '../../components/OvalButton';

const ContactUs = () => {
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = React.useState('');
  const [callingCode, setCallingCode] = useState('1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const CountryPickerAny = CountryPicker;
  const [countryCode, setCountryCode] = useState('US'); // Default country

  const onSelectCountry = country => {
    setCountryCode(country.cca2);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    if (!firstName || !lastName || !email || !message) {
      Alert.alert('Please fill all required fields');
      return;
    }

    const payload = {
      name: `${firstName} ${lastName}`,
      email,
      website: 'BTCY-MOBLIE-APP',
      message:
        message +
        ` \n\n Email: ${email}` +
        ' from  contaced from BTCY-MOBLIE-APP',
      subject: `Contact from ${firstName} email ${email}`,
    };

    console.log('payload', payload);

    const res = await contactUs(payload);

    if (res?.status === 201) {
      Alert.alert('Success', 'Message sent successfully!');
      navigation.goBack();
    } else {
      Alert.alert('Error', res?.message || 'Something went wrong');
    }
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
          <Text style={styles.description}>Contact US</Text>

          {/* Input Fields */}
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
          {/* <TextField
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder={'Phone Number'}
            multiline={false}
          /> */}
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder={'Email'}
            multiline={false}
          />
          <TextField
            label="Message"
            value={message}
            onChangeText={setMessage}
            placeholder={'Message here...'}
            multiline={false}
          />

          {/* Submit Button */}
          {/* <Button
            title="Send"
            onPress={handleSubmit}
            disabled={isLoading}
            loading={isLoading}
          /> */}
          <View style={{marginVertical: 10}}>
            <OvalButton
              textInsideOval="Send"
              onPress={handleSubmit}
              disabled={isLoading}
              loading={isLoading}
            />
          </View>
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
  },
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'black',
    paddingHorizontal: 15, // Ensures padding is applied
    paddingBottom: 35,
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
  logo: {
    width: 250,
    resizeMode: 'contain',
    marginBottom: 75,
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
  description: {
    color: 'white',
    marginTop: 50,
    fontSize: 24,
    alignSelf: 'flex-start',
    maxWidth: 325,
    fontWeight: '600',
    marginBottom: 40,
  },
  normalText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '300',
    marginBottom: 20,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },

  buttonContainer: {
    width: '100%',
    display: 'flex',
    gap: 20,
  },
  button: {
    backgroundColor: '#F88D39',
    paddingVertical: 15,
    width: '100%',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  footerText: {
    color: '#F88D39',
    textAlign: 'center',
    marginTop: 15,
    fontSize: 14,
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  registerText: {
    color: '#fff',
    fontSize: 14,
  },
  registerLink: {
    color: '#F88D39',
    fontWeight: 'bold',
    textDecorationLine: 'underline', // Adds underline
    fontSize: 14,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'grey',
    marginHorizontal: 10,
  },
  orText: {
    color: 'grey',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    width: '100%',
    marginBottom: 15,
  },
  callingCode: {
    fontSize: 16,
    color: '#FFF',
  },
});

export default ContactUs;
