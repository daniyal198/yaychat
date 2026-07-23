import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LockupUpdated = ({visible, onClose}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={20} color="white" />
          </TouchableOpacity>
          <Image source={require('../../../assets/img/lockup_updated.png')} />
          <Text style={styles.title}>
            Your lockup Setting is Successfully Updated!
          </Text>
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

  closeButton: {
    position: 'absolute',
    top: 5,

    right: 5,
    padding: 5, // Add some padding for better touch response
  },
});

export default LockupUpdated;
