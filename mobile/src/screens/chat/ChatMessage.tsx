import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import { getMessages, sendMessage } from '../../services/auth.service';
import { decodeJWT } from '../../utils/jwt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Filter } from 'bad-words'

type RootStackParamList = {
  ChatInbox: undefined;
  ChatMessage: {
    name: string;
    avatar: any;
    email: string;
  };
};

type ChatMessageRouteProp = RouteProp<RootStackParamList, 'ChatMessage'>;
interface Message {
  id: string;
  text: string;
  sender: string;
  avatar?: any;
  isCurrentUser: boolean;
  timestamp: string; // Optional timestamp property
}



const ChatMessage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [_loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [myEmail, setMyEmail] = useState<string>('');

  const route = useRoute<ChatMessageRouteProp>();
  const contactName = route.params.name;
  const contactEmail = route.params.email;
  const contactAvatar = route.params.avatar;

  // Generate groupId using both user emails
  const groupId = [myEmail, contactEmail].sort().join('_');

  const [flatListRef, setFlatListRef] = useState<FlatList | null>(null);

  useEffect(() => {
    if (flatListRef && messages.length > 0) {
      setTimeout(() => {
        flatListRef.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, flatListRef]);
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userObj = decodeJWT(token);
          const email = userObj?.email;
          if (email) {
            setMyEmail(email);
          }
        }
      } catch (err) {
        console.error('Failed to get user email', err);
      }
    };

    fetchUserEmail();
  }, []);

  useEffect(() => {
    if (myEmail) {
      fetchMessages();
    }
    // `fetchMessages` is redefined on every render; listing it here would
    // refetch the thread on each one. The email is the only real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmail]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await getMessages(myEmail);
      console.log('Fetched messages:', data);

      // Filter messages to only show those in the current chat group
      const filteredMessages = data.filter((msg: any) => {
        const participants = [msg.email, msg.receiverEmail].sort().join('_');
        return participants === groupId;
      });

      const formatted = filteredMessages.map((msg: any, index: number) => ({
        id: msg._id || String(index),
        text: msg.message,
        sender: msg.email === myEmail ? "You" : contactName,
        avatar: msg.email === myEmail ? null : contactAvatar,
        isCurrentUser: msg.email === myEmail,
        timestamp: msg.timestamp || new Date().toISOString(), // Use the message timestamp or current time
      }));

      setMessages(formatted);
    } catch (err) {
      console.error('Error _loading messages', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const filter = new Filter();
    if (filter.isProfane(message)) {
      Alert.alert('Error', "Your message contains inappropriate language.");
      setMessage('');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const userObj = decodeJWT(token);

      await sendMessage({
        email: myEmail,
        receiverEmail: contactEmail,
        message: message.trim(),
        firstName: userObj?.firstName || '',
        lastName: userObj?.lastName || '',
        userId: userObj?.id || '',
        groupId: groupId,
        timestamp: new Date(),
        isRead: false
      });

      setMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  // Format date header (Today, Yesterday, or full date)
  const formatDateHeader = (dateString: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const date = new Date(dateString);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
  };


  // Group messages by date and prepare chat data
  const prepareChatData = () => {
    const grouped: { [key: string]: Message[] } = {};

    // Sort messages by timestamp (oldest first)
    const sortedMessages = [...messages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group messages by date
    sortedMessages.forEach(msg => {
      const dateKey = formatDateHeader(msg.timestamp);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(msg);
    });

    // Flatten into array with date headers
    const chatData: (Message | string)[] = [];
    Object.entries(grouped).forEach(([date, msgs]) => {
      chatData.push(date);
      chatData.push(...msgs);
    });

    return chatData;
  };

  const renderItem = ({ item }: { item: Message | string }) => {
    if (typeof item === 'string') {
      // Date header
      return (
        <View style={styles.dateHeaderContainer}>
          <Text style={styles.dateHeaderText}>{item}</Text>
        </View>
      );
    }

    // Message bubble
    return (
      <View style={[
        styles.messageContainer,
        item.isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
      ]}>
        {!item.isCurrentUser && item.avatar && (
          <Image source={item.avatar} style={styles.messageAvatar} />
        )}
        <View style={[
          styles.messageBubble,
          item.isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        ]}>
          {!item.isCurrentUser && (
            <Text style={styles.messageSender}>{item.sender}</Text>
          )}
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={[
            styles.timestamp,
            item.isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
          ]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Messages List */}
      <FlatList
        ref={(ref) => setFlatListRef(ref)}
        data={prepareChatData()}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          typeof item === 'string' ? `header-${index}` : item.id
        }
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef?.scrollToEnd()}
        onLayout={() => flatListRef?.scrollToEnd()}
      />

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TouchableOpacity style={styles.emojiButton}>
            <Text style={styles.emojiIcon}>😊</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type Message..."
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={!message.trim()}>
            <View style={[
              styles.sendButtonInner,
              !message.trim() && { backgroundColor: '#666' }
            ]}>
              <Text style={styles.sendIcon}>➤</Text>
            </View>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  dateHeaderContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  dateHeaderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    paddingBottom: Platform.OS === 'ios' ? 25 : 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 24,
    marginRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: '#FF6B00',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    padding: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  currentUserTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherUserTimestamp: {
    color: 'rgba(255,255,255,0.5)',
  },
  emojiButton: {
    padding: 8,
  },
  emojiIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonInner: {
    backgroundColor: '#FF6B00',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 16,
    transform: [{ rotate: '90deg' }],
  },
});

export default ChatMessage;
