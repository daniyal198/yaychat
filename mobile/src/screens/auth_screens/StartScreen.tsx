import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';

const StartScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Image
        style={styles.logo}
        source={require('../../../assets/img/yay_03.png')}
      />

      <Image
        style={styles.bitcoinYayLogo}
        source={require('../../../assets/img/bitcoin.png')}
      />

      <Text style={styles.subtitle}>Cryptocurrency Mining Anywhere</Text>

      {/* Buttons Wrapper */}
      {/* <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Register')}>
          <Text style={styles.buttonText}>Create an account</Text>
        </TouchableOpacity>
      </View> */}

      {/* <Text style={styles.footer}>Terms of Service • Privacy Policy</Text> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15, // Prevents buttons from touching screen edges
    width: '100%',
  },
  logo: {
    width: 250,
  },
  bitcoinYayLogo: {
    marginTop: 10,
  },
  subtitle: {
    color: '#FFF',
    marginTop: 10,
    marginBottom: 70,
    fontSize: 22,
    maxWidth: 250,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%', // Ensures the container is full width
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%', // Ensures button takes full width of parent container
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'regular',
    fontSize: 17,
  },
  footer: {
    color: '#F88D39',
    fontSize: 12,
    position: 'absolute',
    bottom: 20,
  },
});

export default StartScreen;
