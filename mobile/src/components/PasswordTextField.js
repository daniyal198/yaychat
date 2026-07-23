import React, {useState} from 'react';
import {View, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PasswordTextField = ({placeholder = '', value, onChangeText}) => {
  const [secureText, setSecureText] = useState(true);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="gray"
        secureTextEntry={secureText}
        value={value}
        onChangeText={onChangeText}
        multiline={false}
      />
      <TouchableOpacity
        onPress={() => setSecureText(!secureText)}
        style={styles.icon}>
        <Icon name={secureText ? 'eye-off' : 'eye'} size={24} color="#A0A0A0" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginTop: 5,
    height: 50,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  icon: {
    padding: 10,
  },
});

export default PasswordTextField;
