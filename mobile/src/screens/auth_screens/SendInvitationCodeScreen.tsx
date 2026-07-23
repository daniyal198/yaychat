import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import {useNavigation} from '@react-navigation/native';
import {RootStackParamsList} from '../../RootNavigator';
import {StackNavigationProp} from '@react-navigation/stack';
import {useUserRegistration} from '../../context/UserRegistrationContext';
import OvalButton from '../../components/OvalButton';
type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamsList,
  'WhoInvitedYou'
>;

const SendInvitationCodeScreen = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const [invitationCode, setInvitationCode] = React.useState('');

  const {registrationData, setRegistrationData} = useUserRegistration();

  const handleSubmit = () => {
    setRegistrationData({
      ...registrationData,
      referralCode: invitationCode || '',
    });
    navigation.navigate('TermsAndConditions');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Background Image   */}
            <View style={styles.backgroundImageContainer}>
              <Image
                source={require('../../../assets/img/whoInvitedYou.png')}
                style={styles.backgroundImage}
              />
            </View>

            {/* Title and Subtitle */}
            <Text style={styles.subtitle}>Who invited you?</Text>
            <Text style={styles.description}>
              Add them to your referral Team to increase your mining rate.
            </Text>

            {/* Invitation Code Input */}
            <View style={styles.inputContainer}>
              <TextField
                label="Invitation Code"
                value={invitationCode}
                placeholder="Invitation Code"
                onChangeText={setInvitationCode}
                multiline={false}
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttonWrapper}>
              <OvalButton textInsideOval="Submit" onPress={handleSubmit} />

              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() => navigation.navigate('TermsAndConditions')}>
                <Text style={styles.outlineButtonText}>No one invited me</Text>
              </TouchableOpacity>
            </View>

            {/* Footer Link */}
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
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 35,
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  backgroundImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.06,
  },
  logo: {
    width: 250,
    resizeMode: 'contain',
  },
  bitcoinYayLogo: {
    marginTop: 10,
  },
  subtitle: {
    color: '#FFF',
    marginTop: 100,
    fontSize: 24,
    alignSelf: 'flex-start',
    fontWeight: 500,
  },
  description: {
    color: '#d5d5d5',
    marginTop: 10,
    fontSize: 16,
    alignSelf: 'flex-start',
    maxWidth: 325,
    fontWeight: 'regular',
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 30,
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },
  outlineButton: {
    borderColor: '#F88D39',
    padding: 15,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#F88D39',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  footerText: {
    color: '#F88D39',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default SendInvitationCodeScreen;
