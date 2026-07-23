import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';
import MultiInputField from './MultiInputField';
import { useAuth } from '../context/AuthContext';
import { decodeJWT } from '../utils/jwt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportCompromisedAccount } from '../services/auth.service';

// Define the props interface
interface HelpToProtectAccountPopUpProps {
  visible: boolean;
  onClose: () => void;
}

const HelpToProtectAccountPopUp: React.FC<HelpToProtectAccountPopUpProps> = ({ visible, onClose }) => {
  const [lastName, setLastName] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
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

    try {
      setIsLoading(true);
      const response = await reportCompromisedAccount(email, additionalDetails);

      if (response.status === 200) {
        Alert.alert(
          'Report Submitted',
          'Our security team has been notified. We will contact you shortly.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        throw new Error(response.message || 'Failed to submit report');
      }
    } catch (error: any) {
      console.error('Report error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to submit report. Please try again.'
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

          <Text style={styles.title}>Help me to protect my account</Text>

          <Text style={styles.description}>
            Send us a message if you accidently shared your password or noticed
            suspicious activity on your account. To avoid having your bitcoin
            Yay stolen, change your password on profile page after reporting
            this situation.{'\n'} Please add any information that can assist the
            investigation below.
          </Text>
          <MultiInputField
            label=""
            value={lastName}
            onChangeText={setLastName}
            placeholder=""
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity style={styles.outlineButton} onPress={onClose}>
              <Text style={styles.outlineButtonText} onPress={onClose}
                disabled={isLoading}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleReport}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Report</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 15,
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
    padding: 10,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  outlineButton: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F88D39',
    width: '48%',
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#F88D39',
    fontSize: 16,
  },
});

export default HelpToProtectAccountPopUp;
