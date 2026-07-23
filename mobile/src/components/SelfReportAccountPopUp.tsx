import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';
import TextField from './TextField';
import { Alert } from 'react-native';
import { reportFakeAccount } from '../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../utils/jwt';


// Define the props interface
interface SelfReportAccountPopUp {
  visible: boolean;
  onClose: () => void;
}

const SelfReportAccountPopUp: React.FC<SelfReportAccountPopUp> = ({ visible, onClose }) => {
  const [currentUsername, setCurrentUsername] = useState('');
  const [realUsername, setRealUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReport = async () => {
    let email;
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      const userObj = decodeJWT(token);
      console.log('userObj:', userObj);
      email = userObj.email;
    } else {
      Alert.alert('Error', 'Please login to add phone number');
      return;
    }
    if (!currentUsername || !realUsername) {
      Alert.alert('Error', 'Please fill in both username fields');
      return;
    }

    if (!email) {
      Alert.alert('Error', 'User email not found');
      return;
    }

    try {
      setIsLoading(true);

      // Call the API to report fake account
      const response = await reportFakeAccount(
        email,
        currentUsername,
        realUsername
      );

      if (response.status === 200) {
        Alert.alert(
          'Report Submitted',
          'Our team has received your report and will review it shortly.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        throw new Error(response.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to submit report. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={20} color="white" />
          </TouchableOpacity>

          <Text style={styles.title}>Self Report this Account</Text>

          <Text style={styles.description}>
            Report this account as fake or duplicate account. Please make sure
            you also enter the real account username that you want to keep
          </Text>

          <View style={styles.formContainer}>
            <TextField
              label="This Account will be deactivated"
              value={currentUsername}
              onChangeText={setCurrentUsername}
              placeholder={'@kash7890'}
              multiline={false}
            />
            <TextField
              label="Username for real account to keep"
              value={realUsername}
              onChangeText={setRealUsername}
              placeholder={'@'}
              multiline={false}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.outlineButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleReport}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Confirm & Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 25,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  formContainer: {
    // padding: 16,
    width: '100%',
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    position: 'absolute',
    top: 5,

    right: 15,
    padding: 5, // Add some padding for better touch response
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 12,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
  },
  outlineButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F88D39',
    width: '48%',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#F88D39',
    fontSize: 14,
  },
});

export default SelfReportAccountPopUp;
