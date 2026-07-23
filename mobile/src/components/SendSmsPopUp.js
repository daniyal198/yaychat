import React from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SendSmsPopUp = ({visible, onClose}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Close Button Positioned at Top-Right */}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.title}>Prepare to send SMS</Text>
          <Text style={styles.description}>
            Your SMS app should now open with a pre-written draft.
          </Text>

          <Text style={[styles.description, {fontWeight: 'bold'}]}>
            Send the SMS without changing it, and make sure that the text
            contains a 6-digit code.
          </Text>

          <Text style={styles.description}>
            If your SMS app fails to open, please follow the steps in the
            “Manual instructions” link.
          </Text>

          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Open SMS</Text>
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
    position: 'relative', // Ensures absolute positioning inside
  },
  closeButton: {
    position: 'absolute',
    top: 5,

    right: 15,
    padding: 5, // Add some padding for better touch response
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 15,
  },
  description: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 15,
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
    color: '#000',
    fontSize: 16,
  },
});

export default SendSmsPopUp;
