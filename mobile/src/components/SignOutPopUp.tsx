import React, {useEffect} from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {colors} from '../theme/colors';
import {useAuth} from '../context/AuthContext';
import OvalButton from './OvalButton';

// Define the props interface
interface SignOutPopUpProps {
  visible: boolean;
  onClose: () => void;
}

const SignOutPopUp: React.FC<SignOutPopUpProps> = ({visible, onClose}) => {
  const {logout, isLoggedIn} = useAuth();
  useEffect(() => {
    console.log('isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');

      await logout();
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={20} color="white" />
          </TouchableOpacity>

          <Text style={styles.title}>
            Are you sure you want to sign out? Okay to lose Bitcoin Yay?
          </Text>

          <Text style={styles.description}>
            Your Bitcoin Yay balance is finalized at the end on each 24h mining
            session. Logging out invalidates your current session and all
            Bitcoin Yay mined from that session will be lost. If you sign out,
            we recommended do it right after the end of your session
          </Text>
          <View style={{flexDirection: 'row', gap: 10, marginTop: 20}}>
            <OvalButton textInsideOval="Cancel" onPress={onClose} />
            <OvalButton textInsideOval="Sign Out" onPress={handleLogout} />
            {/* <TouchableOpacity style={styles.outlineButton} onPress={onClose}>
              <Text style={styles.outlineButtonText}>Cancel</Text>
            </TouchableOpacity>
            
          
            {/* <TouchableOpacity style={styles.button} onPress={handleLogout}>
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity> */}
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

export default SignOutPopUp;
