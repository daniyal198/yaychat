import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import CustomPopup from '../../components/CustomPopUp';
import SendSmsPopUp from '../../components/SendSmsPopUp';

const SetPasswordVerificationCode: React.FC = () => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [openSMSmodalVisible, setOpensmsModalVisible] = React.useState(false);
  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Text verification code</Text>
      <Text style={styles.title}>
        You will now need to{' '}
        <Text style={styles.bold}>
          send a test to our verification service in USA.
        </Text>
        <Text>
          {' '}
          Use the “Open SMS” button to automatically open a text message
        </Text>{' '}
      </Text>

      {/* Buttons Wrapper */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setOpensmsModalVisible(true)}>
          <Text style={styles.buttonText}>Open SMS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.outlinebutton}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.outlinebuttonText}>Manual instructions</Text>
        </TouchableOpacity>
      </View>
      <CustomPopup
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      <SendSmsPopUp
        visible={openSMSmodalVisible}
        onClose={() => setOpensmsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20, // Prevents buttons from touching screen edges
    width: '100%',
    marginTop: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#FFF',
    marginTop: 60,
    fontSize: 24,
    maxWidth: 250,
    alignSelf: 'flex-start',
  },
  title: {
    color: '#FFF',
    marginTop: 20,
    marginBottom: 70,
    fontSize: 13,
    maxWidth: 325,
    alignSelf: 'flex-start',
    fontWeight: '300',
  },

  buttonContainer: {
    width: '100%', // Ensures the container is full width
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%', // Ensures button takes full width of parent container
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
  },

  outlinebutton: {
    padding: 15,
    width: '100%', // Ensures button takes full width of parent container
    alignItems: 'center',
    marginVertical: 10,
    fontSize: 16,
  },
  outlinebuttonText: {
    color: '#F88D39',
    fontWeight: '400',
  },
});

export default SetPasswordVerificationCode;
