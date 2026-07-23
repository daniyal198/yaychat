import React from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CommitLockupModal = ({visible, onClose}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={20} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Configure Lockup Settings</Text>
          <Text style={styles.description}>
            By tapping "Commit Lockup," your lockup configuration will
            immediately become binding and cannot be lowered before your next
            Mainnet transfer. The amount designated for lockup cannot be
            withdrawn until the lockup configuration is eligible to start
            receiving lockup rewards based on your mobile balance.
          </Text>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Commit Lockup</Text>
          </TouchableOpacity>
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
    fontSize: 22,
    fontWeight: 600,
    color: '#D5D5D5',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    color: '#d5d5d5',
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

    right: 5,
    padding: 5, // Add some padding for better touch response
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginTop: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 500,
  },
  outlineButton: {
    padding: 15,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#F88D39',
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  outlineButtonText: {
    color: '#F88D39',
    fontSize: 16,
  },
});

export default CommitLockupModal;
