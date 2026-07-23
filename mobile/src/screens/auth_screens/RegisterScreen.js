import {useNavigation} from '@react-navigation/native';
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Image} from 'react-native';

const RegisterScreen = () => {
  const navigation = useNavigation();
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

      <Text style={styles.subtitle}>Cryptocurrency mining anywhere</Text>

      {/* Buttons Wrapper */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('RegisterWithPhone')}>
          <Text style={styles.buttonText}>Register with phone number</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Sign in with Apple</Text>
        </TouchableOpacity> */}
      </View>

      <Text style={styles.footer}>Terms of Service • Privacy Policy</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    // justifyContent: 'center',
    paddingHorizontal: 20, // Prevents buttons from touching screen edges
    width: '100%',
    marginTop: 20,
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
    fontSize: 16,
  },
  footer: {
    color: '#F88D39',
    fontSize: 12,
    position: 'absolute',
    bottom: 20,
  },
});

export default RegisterScreen;
