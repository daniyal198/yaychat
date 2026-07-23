import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../theme/colors';
import ChatIcon from '../../../assets/img/chat_icon.svg';
import OvalButton from '../../components/OvalButton';
import MessageIcon from '../../../assets/img/message_box.svg';
const SupportPortal = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Support Portal</Text>

      <View style={styles.imageContainer}>
        <Image
          source={require('../../../assets/img/gophercall1.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.subtitle}>
        Still need assistance? Our support team is ready to help.
      </Text>

      <View style={styles.buttonsContainer}>
        {/* <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ContactUs')}>
          <View style={styles.buttonIconContainer}>
            <ChatIcon />
          </View>
          <Text style={styles.buttonText}>Contact Live chat</Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color="#fff"
            style={styles.arrowIcon}
          />
        </TouchableOpacity> */}

        {/* <OvalButton
          IconInsideOval={ChatIcon}
          label="Contact Live chat"
          onPress={() => navigation.navigate('ContactUs')}
        /> */}

        {/* <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ContactUs')}>
          <View style={styles.buttonIconContainer}>
            <Ionicons name="mail-outline" size={24} color="#fff" />
          </View>
          <Text style={styles.buttonText}>Send us an Email</Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color="#fff"
            style={styles.arrowIcon}
          />
        </TouchableOpacity> */}

        <OvalButton
          IconInsideOval={MessageIcon}
          label="Send us an Email"
          onPress={() => navigation.navigate('ContactUs')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 40,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  mascotImage: {
    width: 180,
    height: 180,
  },
  subtitle: {
    fontSize: 12,
    color: '#d5d5d5',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 0,
    lineHeight: 24,
  },
  buttonsContainer: {
    paddingHorizontal: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 50,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'flex-start',
  },
  buttonIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  arrowIcon: {
    marginLeft: 8,
  },
});

export default SupportPortal;
