import React from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CustomPopup = ({visible, onClose}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Manual steps</Text>
          <Text style={styles.description}>
            Please send a text message (SMS) to our number verification service
            in USA with the following elements:
          </Text>
          <Text>
            <Text style={styles.bold}>Recipient:</Text>
            <Text
              style={{
                color: '#FFF',
                textAlign: 'center',
                marginTop: 50,
              }}>
              {' '}
              +123456789
            </Text>
          </Text>

          <Text
            style={{
              fontWeight: 'bold',
              color: '#FFF',
              textAlign: 'center',
              marginTop: 15,
            }}>
            Text of the SMS:
          </Text>
          <Text
            style={{fontWeight: 'bold', color: '#FFF', textAlign: 'center'}}>
            579052
          </Text>
          <Text style={styles.description}>
            Make sure that the phone number you send the text from is{' '}
            <Text style={styles.bold}>+639687771723</Text>
          </Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>I have Sent The Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineButton} onPress={onClose}>
            <Text style={styles.outlineButtonText}>Dismiss</Text>
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
    fontSize: 20,
    fontWeight: '500',
    color: '#FFF',
    marginTop: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'left',
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

export default CustomPopup;
