import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';
//import TextField from '../../components/TextField';
import {useNavigation} from '@react-navigation/native';
import {RootStackParamsList} from '../../../RootNavigator';
import {StackNavigationProp} from '@react-navigation/stack';
import Button from '../../../components/Button';
import {
  CodeField,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

import {RouteProp, useRoute} from '@react-navigation/native';

type VerifyRouteProp = RouteProp<
  RootStackParamsList,
  'LoginWithPhoneVerifyPhoneNumber'
>;

const CELL_COUNT = 6;
type StartScreenNavigationProp = StackNavigationProp<
  RootStackParamsList,
  'EmailVerification'
>;

const LoginWithPhoneVerifyPhoneNumber = () => {
  const navigation = useNavigation<StartScreenNavigationProp>();
  const route = useRoute<VerifyRouteProp>();
  const {phone} = route.params;

  const [value, setValue] = React.useState('');
  const ref = useBlurOnFulfill({value, cellCount: CELL_COUNT});
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            {/* Background Image */}
            <View style={styles.backgroundContainer}>
              <Image
                source={require('../../../../assets/img/forget_password_bg.png')}
                style={styles.backgroundImage}
              />
            </View>
            {/* Text Content */}
            <Text style={styles.subtitle}>Verify your Phone Number</Text>
            <Text style={styles.description}>
              Please enter the 6 digits code send to
            </Text>
            <Text
              style={{
                color: '#FFF',
                alignSelf: 'flex-start',
                marginBottom: 20,
                fontSize: 16,
              }}>
              {phone}
            </Text>
            <CodeField
              ref={ref}
              {...props}
              value={value}
              onChangeText={setValue}
              cellCount={CELL_COUNT}
              rootStyle={styles.codeFieldRoot}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              renderCell={({index, symbol, isFocused}) => (
                <View
                  key={index}
                  style={[styles.cell, isFocused && styles.focusCell]}
                  onLayout={getCellOnLayoutHandler(index)}>
                  <Text style={styles.cellText}>{symbol || ' '}</Text>
                </View>
              )}
            />

            <View style={styles.buttonContainer}>
              <Button
                title="Send"
                onPress={() => {
                  // Check if the user came from ForgetPassword screen
                  navigation.navigate('ResetPassword', {
                    phone: phone,
                  });
                }}
              />
            </View>

            {/* Footer Text */}
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
    // justifyContent: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#000',
    paddingVertical: 20,
    width: '100%',
    position: 'relative',
  },
  scrollContainer: {
    flexGrow: 1,
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
    marginTop: 40,
    fontSize: 24,
    fontWeight: 500,
    alignSelf: 'flex-start',
  },
  description: {
    color: 'grey',
    marginTop: 15,
    fontSize: 16,
    alignSelf: 'flex-start',
    maxWidth: 325,
    fontWeight: 400,
    //  marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%',
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  codeFieldRoot: {
    width: '100%',
    marginTop: 10,
  },
  cell: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#2F2F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusCell: {
    borderBottomColor: '#fff',
  },
  cellText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
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
  backgroundContainer: {
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
  },
});

export default LoginWithPhoneVerifyPhoneNumber;
