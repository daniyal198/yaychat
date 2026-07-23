import React from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../../theme/colors';
import OvalButton from '../../components/OvalButton';

// Define the props interface
interface UserActivityTrackingPopupProps {
  visible: boolean;
  onClose: () => void;
  onAllow: () => void;
}

const UserActivityTrackingPopup: React.FC<UserActivityTrackingPopupProps> = ({visible, onClose, onAllow}) => {


  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={20} color="white" />
          </TouchableOpacity>

          <Text style={styles.title}>
          Your Privacy Matters
                    </Text>

          <Text style={styles.description}>
          To continue using Bitcoin Yay, we require your consent to collect essential personal information, including payment and transaction details. This helps us maintain security, provide better support, and improve your experience.
          </Text>
          <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
            <OvalButton textInsideOval="No" onPress={onClose} />
            <OvalButton textInsideOval="Allow" onPress={onAllow} />
        
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

export default UserActivityTrackingPopup;
