import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ProgressCircle from 'react-native-progress/Circle';
import PingActiveIcon from '../../../assets/img/pingActive.svg';
import PlusIcon from '../../../assets/img/plusIcon.svg';
import OvalButton from '../../components/OvalButton';
import MessageIcon from '../../../assets/img/message_box.svg';
import ChatIcon from '../../../assets/img/chat.svg';
import avatar from '../../../assets/img/Avatar.png';
import { getAllReferral, getUserDetails } from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../../utils/jwt';
import { Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Reusable Card Component
const Card = ({ children, style }) => {
  return <View style={[styles.card, style]}>{children}</View>;
};

// Reusable Button Component
const Button = ({ title, onPress, style }) => (
  <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

// Timer Box Component
const TimerBox = ({ time }) => (
  <View style={styles.timerBox}>
    <Text style={styles.timerText}>{time}</Text>
    <Text style={styles.warningText}>
      You are at risk of losing Bitcoin yay!
    </Text>
    <Text style={styles.description}>
      Lorem Ipsum is simply dummy text of the printing and typesetting industry.
      Lorem Ipsum has been the industry's standard dummy text ever since the
      1500s, when an unknown printer took a galley of type and scrambled it to
      make a type specimen book.
    </Text>
    {/* <View style={{ marginVertical: 20 }}>
      <OvalButton label="Send Reminder Message" IconInsideOval={MessageIcon} />
    </View> */}
  </View>
);

const ReferralScreen = ({ route }) => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const navigation = useNavigation();


  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userObj = decodeJWT(token);
          const userEmail = userObj?.email
          const response1 = await getUserDetails(userObj?.email);
          if (response1.status === 200) {
            setUserData(response1.data);
          } else {
            setError('Failed to fetch user data');
          }

          const response = await getAllReferral(userEmail);
          setReferrals(response.data.data.userDetails);
          setLoading(true);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch referrals');
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, []);

  const handleShareReferral = async () => {
    try {
      const message = `Hey! Join Bitcoin yay and start mining with me. Use my referral link to sign up: https://bitcoinyay.com/referral=${userData?.referralCode || 'Robert90'}`;

      await Share.share({
        message,
        title: 'Join Bitcoin yay!',
      });
    } catch (error) {
      console.log('Error sharing referral code:', error);
      Alert.alert('Error', 'Failed to share referral link');
    }
  };

  // Calculate active mining count
  const activeMiningCount = referrals.filter(user => user.isMining).length;
  const totalReferrals = referrals.length;
  const progress = totalReferrals > 0 ? activeMiningCount / totalReferrals : 0;

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF8728" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Retry"
          onPress={() => setError(null)}
          style={styles.retryButton}
        />
      </View>
    );
  }

  const handleReferralTeamChat = async () => {
    try {
      if (referrals.length === 0) {
        Alert.alert('No Referrals', 'You have no referral members to chat with yet.');
        return;
      }
      // Navigate to chat screen
      navigation.navigate('ReferralChatList', {
        referrals: referrals,
        title: 'Your Referral Team',
        subtitle: 'Select a member to chat with'
      });

    } catch (error) {
      console.error('Error creating group chat:', error);
      Alert.alert('Error', 'Failed to create group chat');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Referral Team Card */}
      <Card
        style={{
          flex: 1,
          justifyContent: 'center',
          gap: 10,
        }}>
        <View
          style={{
            flexDirection: 'row',
            flex: 1,
            justifyContent: 'space-between',
            gap: 10,
          }}>
          <View style={{ flexGrow: 0, width: '60%' }}>
            <Text style={styles.title}>Referral Team</Text>
            <Text style={styles.subText}>You have invited {totalReferrals} new</Text>
            <Text style={styles.subText}>
              Gophers so far. Your Referral Team has {totalReferrals} members: {activeMiningCount} of {totalReferrals} are
              currently mining.
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <ProgressCircle
              size={95}
              progress={progress}
              thickness={4}
              color="#FF8728"
            />
            <Text style={styles.miningText}>
              {activeMiningCount}{'\n'}
              <Text style={{ fontSize: 16, fontWeight: 400, color: '#FF8728' }}>
                Mining
              </Text>
            </Text>
          </View>
        </View>

        <View>
          <OvalButton label="Ping Active" IconInsideOval={PingActiveIcon} />
        </View>
      </Card>

      {/* Timer Box */}
      <Card style={styles.timerCard}>
        <TimerBox time="2 Days 13:33:34" />
      </Card>

      {/* Members Section */}
      <Card style={{ backgroundColor: '#000' }}>
        <View style={styles.memberHeader}>
          <Text style={styles.title}>Members ({totalReferrals})</Text>
        </View>
        <Text style={styles.description}>
          Lorem Ipsum is simply dummy text of the printing and typesetting
          industry. Lorem Ipsum has been the industry's standard dummy text ever
          since the 1500s, when an unknown printer took a galley of type and
          scrambled it to make a type specimen book.
        </Text>

        {totalReferrals === 0 ? (
          <Text style={styles.noticeText}>
            No one has joined your Referral team yet. Mine more Bitcoin yay by
            inviting friends to join!
          </Text>
        ) : null}

        {/* Member List */}
        <View style={styles.memberList}>
          {referrals.map((user, index) => (
            <View key={index} style={styles.memberItem}>
              <View style={styles.memberInfo}>
                <Image
                  source={user.profilePic ? { uri: user.profilePic } : avatar}
                  style={styles.avatar}
                />
                <Text style={styles.memberName}>
                  {user.name || user.username || user.email.split('@')[0]}
                </Text>
              </View>
              <Text style={user.isMining ? styles.statusActive : styles.statusInactive}>
                {user.isMining ? 'Active' : 'Inactive'}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <OvalButton label="Referral Team Chat" IconInsideOval={ChatIcon} onPress={handleReferralTeamChat}/>
          <OvalButton label="Invite More" IconInsideOval={PlusIcon} onPress={handleShareReferral} />
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3333',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF8728',
    paddingHorizontal: 30,
  },
  card: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 16,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 4,
  },
  subText: {
    fontSize: 12,
    color: '#d5d5d5',
    marginBottom: 10,
    lineHeight: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: 16,
    width: 100,
    height: 100,
    flexShrink: 0,
    position: 'relative',
  },
  miningText: {
    position: 'absolute',
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 24,
    top: '50%',
    transform: [{ translateY: -15 }],
  },
  timerCard: {
    borderColor: '#FF8728',
    borderWidth: 1,
  },
  timerBox: {
    alignItems: 'center',
  },
  timerText: {
    color: '#11BE6A',
    fontSize: 20,
    fontWeight: '500',
  },
  warningText: {
    color: '#FF8728',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'left',
    marginVertical: 4,
  },
  description: {
    color: '#d5d5d5',
    fontSize: 12,
    textAlign: 'left',
    marginBottom: 10,
    lineHeight: 20,
  },
  noticeText: {
    color: '#B7B7B7',
    opacity: 0.4,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
  },
  reminderButton: {
    backgroundColor: '#FF8728',
    alignSelf: 'flex-start',
    marginVertical: 10,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    color: '#FF8728',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  button: {
    backgroundColor: '#FF8728',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberList: {
    marginVertical: 10,
  },
  memberItem: {
    backgroundColor: '#252525',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  statusActive: {
    color: '#FF8728',
    fontSize: 14,
  },
  statusInactive: {
    color: '#666666',
    fontSize: 14,
  },
});

export default ReferralScreen;