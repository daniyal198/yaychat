import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import TextField from '../../components/TextField';
import OvalButton from '../../components/OvalButton';

const PhoneRegistrationScreen = () => {
  const [invitationcode, setInvitationcode] = React.useState('');

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        <Image
          style={styles.logo}
          source={require('../../../assets/img/yay_03.png')}
        />

        <Image
          style={styles.bitcoinYayLogo}
          source={require('../../../assets/img/bitcoin.png')}
        />

        <Text style={styles.subtitle}>Register with phone number</Text>

        {/* Using the TextField Component */}
        <View style={{marginBottom: 20}}>
          <TextField
            label="Invitation code:"
            value={invitationcode}
            onChangeText={setInvitationcode}
            multiline={false}
          />
        </View>

        {/* Buttons Wrapper */}
        <View style={styles.buttonContainer}>
          {/* <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity> */}
          <OvalButton textInsideOval="Submit" />
        </View>

        <Text style={styles.footer}>Terms of Service • Privacy Policy</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',

    //paddingHorizontal: 20, // Prevents buttons from touching screen edges
    width: '100%',
  },

  scrollContainer: {
    flexGrow: 1,
  },
  logo: {
    width: 250,
  },
  bitcoinYayLogo: {
    marginTop: 10,
  },
  subtitle: {
    color: '#FFF',
    marginTop: 40,
    fontSize: 22,
    maxWidth: 300,
    textAlign: 'center',
  },
  title: {
    color: '#FFF',
    marginTop: 10,
    marginBottom: 70,
    fontSize: 12,
    maxWidth: 325,
    alignSelf: 'flex-start',
    fontWeight: '300',
  },

  buttonContainer: {
    width: '100%', // Ensures the container is full width
  },
  button: {
    backgroundColor: '#FFA500',
    padding: 15,
    width: '100%', // Ensures button takes full width of parent container
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },

  footer: {
    color: '#FFA500',
    fontSize: 12,
    position: 'absolute',
    bottom: 20,
  },
});

export default PhoneRegistrationScreen;
