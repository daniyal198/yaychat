import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  DeviceEventEmitter,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Button from '../../components/Button';
import {
  getAllReferral,
  getMiningStatus,
  getUserDetails,
  getUserMiningBalance,
  startMining,
} from '../../services/auth.service';
import {decodeJWT} from '../../utils/jwt';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ChatIcon from '../../../assets/img/chat.svg';
import MinerGroupIcon from '../../../assets/img/memberIcon.svg';
import MiningRateIcon from '../../../assets/img/miningRate.svg';
import InviteIcon from '../../../assets/img/inviteIcon.svg';
import OvalButton from '../../components/OvalButton';
import ViewDetailIcon from '../../../assets/img/view_mining_detail_icon.svg';
import StartMiningIcon from '../../../assets/img/start_mining_icon.svg';
import StartMiningPng from '../../../assets/img/start_mining_icon.png';
import {Share} from 'react-native';

const StartMiningScreen = () => {
  const navigation = useNavigation();
  const [miningData, setMiningData] = useState({
    isActive: false,
    baseBalance: '0.00000', // Balance from API
    currentSessionEarnings: 0, // Earnings from current session
    startTime: null,
    miningRate: 0, // Mining rate per hour
    miningDuration: 24 * 60 * 60, // Default 24 hours in seconds
  });
  const [remainingTime, setRemainingTime] = useState(0);
  const [email, setEmail] = useState('');
  const [timerInterval, setTimerInterval] = useState(null);
  const [activeMiningCount, setActiveMiningCount] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [userData, setUserData] = useState(null);
  // Format time to HH:MM:SS (countdown format)
  const formatCountdown = seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':');
  };

  // Calculate current session earnings based on elapsed time and mining rate
  const calculateCurrentEarnings = (startTime, rate) => {
    if (!startTime || !rate) return 0;
    const now = new Date();
    const start = new Date(startTime);
    const elapsedHours = (now - start) / (1000 * 60 * 60); // Convert ms to hours
    return elapsedHours * rate;
  };

  // Calculate remaining time and update earnings
  const updateMiningStats = (startTime, duration, rate) => {
    const now = new Date();
    const start = new Date(startTime);

    // Calculate remaining time
    const elapsedSeconds = Math.floor((now - start) / 1000);
    const remaining = Math.max(0, duration - elapsedSeconds);
    setRemainingTime(remaining);

    // Update isActive status if time runs out
    if (remaining <= 0) {
      setMiningData(prev => ({
        ...prev,
        isActive: false,
        currentSessionEarnings: 0,
      }));
      return false;
    }

    // Calculate current session earnings
    const earnings = calculateCurrentEarnings(startTime, rate);
    setMiningData(prev => ({
      ...prev,
      currentSessionEarnings: earnings,
    }));

    return remaining > 0;
  };

  // Start the mining timer
  const startMiningTimer = (startTime, duration, rate) => {
    if (timerInterval) clearInterval(timerInterval);

    // Initial calculation
    const shouldContinue = updateMiningStats(startTime, duration, rate);

    if (shouldContinue) {
      const interval = setInterval(() => {
        const shouldContinue = updateMiningStats(startTime, duration, rate);
        if (!shouldContinue) {
          clearInterval(interval);
        }
      }, 1000);

      setTimerInterval(interval);
    }
  };

  // Fetch mining data
  const fetchMiningData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userObj = decodeJWT(token);
        const userEmail = userObj?.email;
        setEmail(userEmail);

        const [status, balanceRes, referralRes, userDetails] =
          await Promise.all([
            getMiningStatus(userEmail),
            getUserMiningBalance(userEmail),
            getAllReferral(userEmail),
            getUserDetails(userObj?.email),
          ]);

        if (userDetails.status === 200) {
          setUserData(userDetails.data);
        }
        // Calculate active mining referrals
        const activeMining =
          referralRes?.data?.data?.userDetails?.filter(user => user.isMining)
            .length || 0;
        const totalRefs = referralRes?.data?.data?.userDetails?.length || 0;

        setActiveMiningCount(activeMining);
        setTotalReferrals(totalRefs);

        let cal =
          //Number(balanceRes?.data?.migratedBalance) +
          Number(balanceRes?.data?.unverifiedBalance) +
          Number(balanceRes?.data?.transferableBalance)
          //Number(status?.data?.totalMined);

        setMiningData({
          isActive: status?.data?.isMiningActive || false,
          baseBalance: cal,
          currentSessionEarnings: 0,
          startTime: status?.data?.startTime,
          miningRate: status?.data?.miningRate || 0,
          miningDuration: 24 * 60 * 60, // 24 hours in seconds
        });

        if (status?.data?.isMiningActive && status?.data?.startTime) {
          startMiningTimer(
            status.data.startTime,
            24 * 60 * 60, // duration
            status.data.miningRate,
          );
        }
      }
    } catch (err) {
      console.log('Failed to fetch mining details:', err);
      Alert.alert('Error', 'Failed to load mining data');
    }
  };

  useEffect(() => {
    fetchMiningData();

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
    // Mount-once fetch. Adding `timerInterval` would tear down and restart the
    // 1s mining timer on every tick, because the effect sets it itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMiningFunction = async () => {
    try {
      // Call your backend API to start mining
      const response = await startMining(email); // Replace with your actual API call
      if (response.status === 200) {
        // Update UI state
        await fetchMiningData();
        DeviceEventEmitter.emit('miningStarted', true);
      } else {
        // Handle error
        console.error('Failed to start mining:', response);
        Alert.alert('Error', 'Failed to start mining. Please try again.');
      }

      // Optionally, navigate to a confirmation screen
      // navigation.navigate('MiningConfirmation');
    } catch (error) {
      console.error('Failed to start mining:', error);
      Alert.alert('Error', 'Failed to start mining. Please try again.');
    }
  };

  // Calculate total balance (base + current session earnings)
  const totalBalance = () => {
    const base = parseFloat(miningData.baseBalance) || 0;
    const current = miningData.currentSessionEarnings || 0;
    return (base + current).toFixed(5);
  };

  const handleShareReferral = async () => {
    try {
      const message = `Hey! Join Bitcoin yay and start mining with me. Use my referral link to sign up: https://bitcoinyay.com/referral=${
        userData?.referralCode || 'Robert90'
      }`;

      await Share.share({
        message,
        title: 'Join Bitcoin yay!',
      });
    } catch (error) {
      console.log('Error sharing referral code:', error);
      Alert.alert('Error', 'Failed to share referral link');
    }
  };

  return (
    <ScrollView style={{flex:1}}>
    <View style={styles.container}>
      <View style={styles.bgImg}>
        <Image
          style={styles.logo}
          source={require('../../../assets/img/yey_outline.png')}
        />
      </View>
     

      <View style={{ width: '100%', alignItems: 'center',gap:20}}>
      <View style={{marginBottom: '10'}}>
        <Image
          style={styles.logo}
          source={require('../../../assets/img/yay_03.png')}
        />
      </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balance}>{totalBalance()}</Text>
          <Image
            style={styles.coinIcon}
            source={require('../../../assets/img/yayB1.png')}
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          borderWidth: 1,
          width: '100%',
        }}>
        <View style={{width: '60'}}></View>

        <View style={{justifyContent: 'center', alignItems: 'center'}}>
          <Image
            style={{width:200}}
            source={
              !miningData.isActive
                ? require('../../../assets/img/gopher.png')
                : require('../../../assets/img/cartwithcoins.png')
            }
            resizeMode="contain"
          />
          <Text style={styles.miningText}>
            <Text
              style={{
                color: '#B7B7B7',
                fontSize: 30,
                fontWeight: 500,
                marginBottom: 30,
                // fontFamily: 'poppins',
              }}>
              {miningData.isActive
                ? formatCountdown(remainingTime)
                : '24:00:00'}
            </Text>
          </Text>
        </View>

        <View>
          {/* Add the navigation icons */}
          <View style={styles.navIconsContainer}>
            <TouchableOpacity
              style={styles.navIconWrapper}
              onPress={() => navigation.navigate('ChatStart')}>
              <ChatIcon style={{height: 40}} />
              <Text style={styles.navText}>chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navIconWrapper}
              onPress={() => navigation.navigate('Referral')}>
              <MinerGroupIcon style={{height: 40}} />
              <Text style={styles.navText}>
                {`${activeMiningCount}/${totalReferrals}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navIconWrapper}
              onPress={() => {
                Alert.alert(
                  'Mining Rate',
                  `Your current mining speed is ${miningData.miningRate.toFixed(2)}B/h`
                );
              }}>
              <MiningRateIcon style={{height: 40}} />
              <Text style={styles.navText}>
                {`${miningData.miningRate.toFixed(2)}B/h`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navIconWrapper}
              onPress={handleShareReferral}>
              <InviteIcon style={{height: 40}} />
              <Text style={styles.navText}>Invite</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <View style={{width: '100%', paddingHorizontal: 15, paddingBottom: 50}}>
       
           <OvalButton
          label={
            miningData.isActive && remainingTime > 0
              ? 'View Mining Details'
              : 'Start Mining'
          }
          IconInsideOval={
            miningData.isActive && remainingTime > 0
              ? ViewDetailIcon
              : StartMiningPng
          }
          isPng={miningData.isActive && remainingTime > 0 ? false : true}
          onPress={() =>
            miningData.isActive && remainingTime > 0
              ? navigation.navigate('MiningDetails')
              : startMiningFunction()
          }
        />
     
      </View>
    </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5, // Prevents buttons from touching screen edges
    width: '100%',
    position: 'relative',
    marginTop: 20,
  },
  bgImg: {
    position: 'absolute',
    bottom: -50,
    right: -50,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '50',
  },
  balance: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#b7b7b7',
    marginRight: 8, // Add some spacing between text and icon
  },
  coinIcon: {
    width: 24, // Adjust as needed
    height: 24, // Adjust as needed
  },
  miningText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '400',
    marginBottom: 40,
  },
  miningText1: {
    fontSize: 56,
    color: '#b7b7b7',
    fontWeight: '400',
  },
  subtitle: {
    color: '#FFF',
    marginTop: 10,
    marginBottom: 50,
    fontSize: 22,
    maxWidth: 250,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%', // Ensures the container is full width
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'red',
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%', // Ensures button takes full width of parent container
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 20,
   
  },
  buttonText: {
    color: '#000',
    fontWeight: 'regular',
    fontSize: 17,
  },
  navIconsContainer: {
    width: 80, // Adjust width as needed
    gap: 35,
    marginBottom: 10,
  },
  navIconWrapper: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  navIcon: {
    width: 24,
    height: 24,
    marginBottom: 4,
  },
  navText: {
    color: '#B7B7B7',
    fontSize: 12,
    textTransform: 'uppercase', // Makes text uppercase like in the image
  },
  navSubtext: {
    color: '#B7B7B7',
    fontSize: 10,
    marginTop: 2,
  },
});

export default StartMiningScreen;
