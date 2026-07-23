// PasswordScreen.js
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import InputField from './InputField';
import Button from './Button';
import OvalButton from './OvalButton';

const PasswordScreen = ({navigation}) => (
  <View style={styles.container}>
    <Text style={styles.logo}>Create Password</Text>
    <InputField placeholder="Password" secureTextEntry />
    <InputField placeholder="Verify your password" secureTextEntry />
    <OvalButton
      textInsideOval="Submit"
      onPress={() => navigation.navigate('AccountSetupScreen')}
    />
    {/* 
    <Button
      title="Submit"
      onPress={() => navigation.navigate('AccountSetupScreen')}
    /> */}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  logo: {
    fontSize: 24,
    color: '#FFA500',
    marginBottom: 20,
  },
});

export default PasswordScreen;
