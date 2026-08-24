import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet} from 'react-native';
import {colors} from '../theme/colors';

type MultiInputFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxWords?: number;
};

const MultiInputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  maxWords = 315,
}: MultiInputFieldProps) => {
  const [wordCount, setWordCount] = useState(0);
  const handleTextChange = (text: string) => {
    const words = text.match(/\b\w+\b/g) || []; // Match only words, ignore spaces
    const count = words.length; // Count actual words typed

    if (count <= maxWords) {
      setWordCount(count);
      onChangeText(text);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
      />
      <Text style={styles.counter}>{`${wordCount}/${maxWords} words`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    height: 334, // Increase height
    textAlignVertical: 'top', // Align text to top
  },
  counter: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
});

export default MultiInputField;
