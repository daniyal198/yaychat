import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAllMiningUsers, getLastMessages } from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../../utils/jwt';

type RootStackParamList = {
  ChatInbox: undefined;
  ChatMessage: {
    name: string;
    avatar: any;
    email: string;
  };
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChatInbox'
>;

interface ChatItem {
  id: string;
  name: string;
  email: string;
  message: string;
  avatar: any; // Using any for require() type
  unread: boolean;
}

// Mock data for chat list
// const chatData: ChatItem[] = [
//   {
//     id: '1',
//     name: 'Kash James',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-1.png'),
//     unread: true,
//   },
//   {
//     id: '2',
//     name: 'Tania Fox',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-2.png'),
//     unread: true,
//   },
//   {
//     id: '3',
//     name: 'Jimmy Star',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-3.png'),
//     unread: true,
//   },
//   {
//     id: '4',
//     name: 'Josh Kim',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-4.png'),
//     unread: true,
//   },
//   {
//     id: '5',
//     name: 'Live Bitcoin Yey Mining',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-5.png'),
//     unread: true,
//   },
//   {
//     id: '6',
//     name: 'Marry Fox',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-6.png'),
//     unread: true,
//   },
//   {
//     id: '7',
//     name: 'Kevin Gray',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-7.png'),
//     unread: true,
//   },
//   {
//     id: '8',
//     name: 'Richa Nelson',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-8.png'),
//     unread: true,
//   },
//   {
//     id: '9',
//     name: 'Peter David',
//     message: "Hi, it's mining time tonight...",
//     avatar: require('../../../assets/img/img-1.png'),
//     unread: true,
//   },
// ];

const ChatInbox = () => {
  const navigation = useNavigation<NavigationProp>();
  const [chatData, setChatData] = useState<ChatItem[]>([]);
  const [filteredChatData, setFilteredChatData] = useState<ChatItem[]>([]); // Add this line
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      const fetchUsers = async () => {
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) return;

          const userObj = decodeJWT(token);
          const currentUserEmail = userObj?.email?.trim().toLowerCase();
          const currentUserName = userObj?.name || "You";

          const [miningUsersRes, lastMessagesRes] = await Promise.all([
            getAllMiningUsers(),
            getLastMessages(currentUserEmail)
          ]);

          let currentUserProfilePic = null;
          const uniqueUsersMap = new Map<string, any>();

          // Store mining users data
          for (const user of miningUsersRes.data) {
            const email = user.email.trim().toLowerCase();
            if (email === currentUserEmail) {
              currentUserProfilePic = user.profilePic;
              continue;
            }
            if (!uniqueUsersMap.has(email)) {
              uniqueUsersMap.set(email, user);
            }
          }

          // Create maps for last messages and read status
          const lastMessagesMap = new Map<string, string>();
          const unreadStatusMap = new Map<string, boolean>();
          console.log("lastMessagesRes", lastMessagesRes)
          lastMessagesRes.forEach((msg: any) => {
            const otherUserEmail = msg.email === currentUserEmail
              ? msg.receiverEmail
              : msg.email;

            lastMessagesMap.set(otherUserEmail, msg.message);

            // Message is unread if it's received (not sent) and isRead is false
            const isReceivedMessage = msg.email !== currentUserEmail;
            unreadStatusMap.set(otherUserEmail, isReceivedMessage && !msg.isRead);
          });

          console.log("unreadStatusMap", unreadStatusMap)
          const hasImage = !!currentUserProfilePic;
          const fallbackImages = [
            require('../../../assets/img/img-1.png'),
            require('../../../assets/img/img-2.png'),
            require('../../../assets/img/img-3.png'),
            require('../../../assets/img/img-4.png'),
            require('../../../assets/img/img-5.png'),
            require('../../../assets/img/img-6.png'),
            require('../../../assets/img/img-7.png'),
          ];

          // Format users with last messages and unread status
          const formattedUsers = Array.from(uniqueUsersMap.values()).map(
            (user: any, index: number) => ({
              id: String(index + 1),
              name: user.name?.trim() || user.email.split('@')[0],
              email: user.email,
              message: lastMessagesMap.get(user.email) || "Start a conversation",
              avatar: user.profilePic ? { uri: user.profilePic } :
                fallbackImages[index % fallbackImages.length],
              unread: unreadStatusMap.get(user.email) || false,
            })
          );

          const currentUserItem = {
            id: '0',
            name: currentUserName,
            email: currentUserEmail,
            message: "You are here",
            avatar: hasImage ? { uri: currentUserProfilePic } : require('../../../assets/img/img-8.png'),
            unread: false, // Current user never shows unread
          };

          setChatData([currentUserItem, ...formattedUsers]);
          setFilteredChatData([currentUserItem, ...formattedUsers]);
        } catch (err) {
          console.error("Failed to fetch users", err);
        }
      };

      fetchUsers();
    }, [])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredChatData(chatData);
      return;
    }

    const filtered = chatData.filter(chat => {
      const searchLower = query.toLowerCase();
      return (
        chat.name.toLowerCase().includes(searchLower) ||
        (chat.message && chat.message.toLowerCase().includes(searchLower))
      );
    });
    setFilteredChatData(filtered);
  };

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        navigation.navigate('ChatMessage', {
          name: item.name,
          avatar: item.avatar,
          email: item.email,
        })
      }
    >
      <Image source={item.avatar} style={styles.avatar} />
      <View style={styles.chatInfo}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.message}>{item.message}</Text>
      </View>
      {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Title */}
      <Text style={styles.title}>Chat</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          placeholderTextColor="#666"
          onChangeText={handleSearch}
          value={searchQuery}
        />
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChatData}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
      />
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
  backIcon: {
    color: '#fff',
    fontSize: 24,
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
    marginBottom: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    color: '#666',
    fontSize: 14,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
    marginLeft: 8,
  },
});

export default ChatInbox;
