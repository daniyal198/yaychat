import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import PasswordTextField from '../../components/PasswordTextField';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamsList } from '../../RootNavigator';
import { StackNavigationProp } from '@react-navigation/stack';

type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamsList,
  'LoginWithPassword'
>;

const LoginWithPassword: React.FC = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const [password, setPassword] = React.useState('');


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Image
              style={styles.logo}
              source={require('../../../../assets/img/yay_03.png')}
            />

            <Image
              style={styles.bitcoinYayLogo}
              source={require('../../../../assets/img/bitcoin.png')}
            />

            <Text style={styles.subtitle}>Enter your password</Text>

            {/* Email Fields */}
            <View style={styles.inputContainer}>
              {/* <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
              /> */}
              <Text style={styles.label}>Password:</Text>
              <PasswordTextField
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
              />

            </View>

            {/* Button */}
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgetPassword')}>
              <Text style={styles.footerText2}>Forget password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerText2}>Return to login page</Text>
            </TouchableOpacity>

            {/* Footer Text */}
            <Text style={styles.footerText}>
              You will need to verify your number to claim the coins you mine.
              Bitcoin Yay mined by unverified numbers will be burned.
            </Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  logo: {
    width: 250,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'left',
    color: 'white',
  },

  bitcoinYayLogo: {
    marginTop: 10,
  },
  subtitle: {
    color: '#FFF',
    marginTop: 40,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 50,
  },
  description: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 12,
    textAlign: 'left',
    maxWidth: 325,
    fontWeight: '300',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },

  footerText: {
    color: '#B6B6B6',
    textAlign: 'left',
    marginTop: 40,

    fontSize: 12,
    maxWidth: 300,
  },
  footerText2: {
    color: '#F88D39',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});

export default LoginWithPassword;
