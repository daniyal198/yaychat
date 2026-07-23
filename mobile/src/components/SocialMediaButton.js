import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';

const SocialMediaButton = ({ Icon, title, onPress, loading = false, disabled = false }) => (
  <TouchableOpacity
    style={[styles.socialButton, disabled && styles.disabledButton]}
    onPress={onPress}
    disabled={disabled}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#FFF" style={styles.loader} />
    ) : (
      <>
        <Icon style={styles.icon} />
        <Text style={styles.buttonText}>{title}</Text>
      </>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  socialButton: {
    backgroundColor: '#F88D39',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  loader: {
    paddingVertical: 2,
  },
});

export default SocialMediaButton;
