import React from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';

const TextField = ({
  label,
  placeholder,
  labelColor = 'white',
  value,
  onChangeText,
  numberOfLines = 1,
  multiline = true,
}) => {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, {color: labelColor}]}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        style={styles.input}
        placeholderTextColor="gray"
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={40}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 15,
    alignSelf: 'flex-start', // Ensures it aligns to the left
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'left', // Left-aligns the label text
  },
  input: {
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 10,
    height: 50,
    padding: 10,
    fontSize: 16,
    color: 'white',
    textAlign: 'left', // Ensures input text is also left-aligned
  },
});

export default TextField;
