import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const OutlineButton = ({ title, onPress, borderColor = 'orange', textColor = 'orange' }) => {
  return (
    <TouchableOpacity
      style={[styles.button, { borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 360,
    paddingVertical: 12,
    borderWidth: 2,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OutlineButton;
