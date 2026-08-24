import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, useWindowDimensions, StatusBar} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import ChatLargeIcon from '../../../assets/img/chatLargeIcon.svg';
import OvalButton from '../../components/OvalButton';
import StartChatIcon from '../../../assets/img/startChatIcon.svg';
type RootStackParamList = {
  ChatStart: undefined;
  ChatInbox: undefined;
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChatStart'
>;

// You might need to install react-native-vector-icons

const ChatStart = () => {
  const {height} = useWindowDimensions();
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Title */}
      <Text style={styles.title}>Chat</Text>

      {/* Main Content */}
      <View style={[styles.content, {height: height * 0.7}]}>
        {/* Chat Icon */}
        <View style={styles.chatIconContainer}>
          <ChatLargeIcon />
        </View>

        {/* Message */}
        <Text style={styles.message}>
          Every great connection starts with a simple "Hi"—go ahead, start
          chatting!
        </Text>

        {/* Start Chat Button */}
        {/* <TouchableOpacity
          style={styles.startChatButton}
            onPress={() => navigation.navigate('ChatInbox')}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonText}>Start Chat</Text>
          </View>
        </TouchableOpacity> */}

        <OvalButton
          label="Start Chat"
          IconInsideOval={StartChatIcon}
          onPress={() => navigation.navigate('ChatInbox')}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
  },
  balance: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  faqButton: {
    padding: 8,
  },
  faqText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  chatIconContainer: {
    marginBottom: 24,
  },
  chatBubble: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  message: {
    color: '#d5d5d5',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  startChatButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatStart;
