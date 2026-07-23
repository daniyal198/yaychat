import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../utils/jwt';
import { createBTCYWallet, getAllVestingSettingsForBTCY, getBTCYAcknowledgementStatus, getBTCYMigrationStatus, getMiningStatus, getUserDetails, getUserMiningBalance, getUserWalletDetailsByNetwork, getVestingForEmail, updateBTCYAcknowledgementStatus, withdrawBTCY } from '../services/auth.service';
import OvalButton from '../components/OvalButton';
import WalletIcon from '../../assets/img/createWallet.svg';
const TransferableBalance = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [vestingOption, setVestingOption] = useState(null);
  const [vestingDetails, setVestingDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSignedAcknowledgement, setIsSignedAcknowledgement] = useState(false);
  const [ackDate, setAckDate] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState('Not Started');
  const [migrationDate, setMigrationDate] = useState(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userObj = decodeJWT(token);
        const response = await getUserDetails(userObj?.email);
        if (response.status === 200) {
          setUserData(response.data);
          // Check Wallet
          const walletRes = await getUserWalletDetailsByNetwork(userObj?.email, 'BTCY', 'Stellar');
          if (walletRes.status === 200) {
            setWalletAddress(walletRes.data.coinWalletAddress);
          } else {
            setWalletAddress(null);
          }

          // Fetch vesting data
          const vesting = await getVestingForEmail(userObj?.email);
          if (vesting.status === 200) {
            setVestingOption(vesting?.data || 'Not Selected');
          } else {
            setVestingOption('Not Selected');
          }
          setVestingOption(vesting?.data || 'Not Selected');

          // Fetch vesting config list
          const allVestingOptions = await getAllVestingSettingsForBTCY('BTCY');
          setVestingDetails(allVestingOptions?.data || []);

          const ackRes = await getBTCYAcknowledgementStatus(userObj?.email);
          setIsSignedAcknowledgement(ackRes?.data?.BTCYAcknowledgementStatus || false);
          setAckDate(ackRes?.data?.BTCYAcknowledgementDate || null);

          const migrationRes = await getBTCYMigrationStatus(userObj?.email);
          setMigrationStatus(migrationRes?.data?.BTCYMigrationStatus || 'Not Started');
          setMigrationDate(migrationRes?.data?.BTCYMigrationDate || null);
        } else {
          setError('Failed to fetch user data');
        }
      }
    } catch (err) {
      console.log('Error fetching user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const matchingVesting = vestingDetails.find(v => v.option === vestingOption.option);

  const handleKYC = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return Alert.alert('Error', 'User not authenticated');

      const user = decodeJWT(token);
      const email = user?.email;

      if (!userData?.kycStatus || !userData?.isKYCPass) {
        Linking.openURL('https://verify-with.blockpass.org/?clientId=indexx_2c1c1&serviceName=Indexx.ai&env=prod');
      } else {
        const walletRes = await getUserWalletDetailsByNetwork(email, 'BTCY', 'Stellar');

        if (!walletRes?.walletAddress) {
          const newWallet = await createBTCYWallet(email, 'BTCY', 3);
          Alert.alert('Wallet Created', `New BTCY Wallet: ${newWallet.walletAddress}`);
        } else {
          Alert.alert('Wallet Exists', `Your Wallet: ${walletRes.walletAddress}`);
        }
      }
    } catch (err) {
      Alert.alert('Error', err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  const createNewBTCYWallet = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return Alert.alert('Error', 'User not authenticated');

      const user = decodeJWT(token);
      const email = user?.email;


      const walletRes = await getUserWalletDetailsByNetwork(email, 'BTCY', 'Stellar');

      if (!walletRes?.walletAddress) {
        const newWallet = await createBTCYWallet(email, 'BTCY', 'Stellar');
        Alert.alert('Wallet Created', `New BTCY Wallet: ${newWallet.data.coinWalletAddress}`);
      } else {
        Alert.alert('Wallet Exists', `Your Wallet: ${walletRes.walletAddress}`);
      }
      fetchUserData(); // Refresh user data after creating wallet
    } catch (err) {
      Alert.alert('Error', err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const withdrawBTCYToWallet = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return Alert.alert('Error', 'User not authenticated');

      const user = decodeJWT(token);
      const email = user?.email;
      if (!email) return Alert.alert('Error', 'User email not found');

      // Get all required data
      const [walletRes, status, balanceRes] = await Promise.all([
        getUserWalletDetailsByNetwork(email, 'BTCY', 'Stellar'),
        getMiningStatus(email),
        getUserMiningBalance(email),
      ]);

      // Calculate available balance
      const MINIMUM_WITHDRAWAL = 10000; // 10,000 BTCY minimum
      const availableBalance = Number(balanceRes?.data?.transferableBalance || 0);//+ Number(status?.data?.totalMined || 0);

      // Check if user has a wallet
      if (!walletRes?.data?.coinWalletAddress) {
        return Alert.alert('Error', 'No BTCY wallet found. Please create one first.');
      }

      // Check minimum withdrawal amount
      if (availableBalance < MINIMUM_WITHDRAWAL) {
        const needed = MINIMUM_WITHDRAWAL - availableBalance;
        return Alert.alert(
          'Insufficient Balance',
          `You need ${needed.toLocaleString()} more BTCY to withdraw (Minimum: ${MINIMUM_WITHDRAWAL.toLocaleString()} BTCY)`
        );
      }

      // Confirm withdrawal with user
      Alert.alert(
        'Confirm Withdrawal',
        `Withdraw ${availableBalance.toLocaleString()} BTCY to your wallet?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                const withdrawalResult = await withdrawBTCY(
                  email,
                  'BTCY',
                  availableBalance,
                  walletRes.data.coinWalletAddress
                );

                if (withdrawalResult.status === 200) {
                  Alert.alert(
                    'Success',
                    `${availableBalance.toLocaleString()} BTCY withdrawn successfully!`
                  );
                } else {
                  throw new Error(withdrawalResult.data?.message || 'Withdrawal failed');
                }
              } catch (err) {
                Alert.alert('Error', err.message);
              }
            }
          }
        ]
      );

    } catch (err) {
      console.error('Withdrawal error:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgement = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const userObj = decodeJWT(token);
      const res = await updateBTCYAcknowledgementStatus(userObj?.email);
      setIsSignedAcknowledgement(true);
      setAckDate(res?.data?.BTCYAcknowledgementDate);
      Alert.alert('Acknowledged', 'Your acknowledgement has been recorded.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update acknowledgement.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8728" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const isAllStepsComplete = userData?.kycStatus === 'Completed' && userData?.isKYCPass && walletAddress && vestingOption !== 'Not Selected';


  return (
    <ScrollView style={styles.container}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          alignSelf: 'flex-start',
          width: '100%',

          marginBottom: 20,
        }}>
        <Text style={styles.title}>Mainnet Checklist</Text>
      </View>

      <Text style={styles.description}>
        Please follow these steps to prepare for the transfer of your{' '}
        <Text style={styles.orangeText}> Bitcoin Yay</Text> and Mobile Balance
        to the Mainnet
      </Text>

      {userData?.kycStatus === 'Completed' && userData?.isKYCPass ? (
        <View style={[styles.sectionWithBg, { borderColor: 'green', borderWidth: 1 }]}>
          <View style={{ marginBottom: 8 }}>
            <Text style={[styles.sectionTitle]}>KYC Verified</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: 'green' }]}>
            Your KYC is verified and approved. You’re ready for Mainnet migration.
          </Text>
        </View>
      ) : (
        <View style={styles.sectionWithBg}>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Submit your KYC Application</Text>
          </View>
          <Text style={styles.sectionDescription}>
            KYC (Identity Verification) is a prerequisite to transfer your Mobile Balance to the Mainnet blockchain.
          </Text>
          {/* <TouchableOpacity style={styles.faqButton} onPress={handleKYC}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.buttonText}>Start</Text>
              <Ionicons name="chevron-forward-outline" size={12} color={'#fff'} />
            </View>
          </TouchableOpacity> */}
          <OvalButton textInsideOval="Start" onPress={handleKYC} />
        </View>
      )}

      {userData?.kycStatus === 'Completed' && userData?.isKYCPass ? (<></>) : (
        <View style={styles.sectionWithBg}>
          <View
            style={{
              marginBottom: 8,
            }}>
            <Text style={styles.sectionTitle}>Wait for KYC Results</Text>
          </View>

          <Text style={styles.sectionDescription}>
            KYC results depend on identity verification, ensuring your name
            matches your Bitcoin yay account, screening against government AML and
            anti-terrorism sanction lists, and checking for any history of
            scripting or policy violations on the account.
          </Text>
        </View>
      )}

      {walletAddress ? (<>
        <View style={[styles.sectionWithBg, { borderColor: 'green', borderWidth: 1 }]}>
          <Text style={styles.sectionTitle}>Your BTCY wallet address:</Text>
          <Text style={[styles.sectionDescription, { color: 'green' }]}>
            {walletAddress}
          </Text>
        </View>
      </>
      ) : (
        <View style={styles.sectionWithBg}>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>Create a Bitcoin Yay Wallet</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Your BTCY Wallet stores your Bitcoin Yay on the Stellar Blockchain.
          </Text>
          {/* <TouchableOpacity style={styles.faqButton} onPress={createNewBTCYWallet}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.buttonText}>Create</Text>
              <Ionicons name="chevron-forward-outline" size={12} color={'#fff'} />
            </View>
          </TouchableOpacity> */}
          <OvalButton label="Create" IconInsideOval={WalletIcon} onPress={createNewBTCYWallet} />
        </View>
      )}

      {/* {walletAddress && (
        <View style={styles.sectionWithBg}>
          <Text style={styles.sectionTitle}>Confirm your BTCY Wallet</Text>
          <Text style={styles.sectionDescription}>
            Wallet confirmed. Your BTCY wallet:{' '}
            <Text style={{ color: 'green' }}>{walletAddress}</Text>
          </Text>
        </View>
      )} */}


      {vestingOption?.option !== 'Not Selected' && (
        <View style={styles.sectionWithBg}>
          <Text style={styles.sectionTitle}>Commit to Lockup configuration</Text>
          <Text style={styles.sectionDescription}>
            You’ve committed to: <Text style={{ color: '#FF8728' }}>{vestingOption?.option}</Text>
          </Text>
        </View>
      )}


      {(vestingOption?.option !== 'Not Selected' && matchingVesting) ? (
        <View style={styles.sectionWithBg}>
          <Text style={styles.sectionTitle}>Lockup Configuration</Text>
          <Text style={styles.sectionDescription}>
            You’ve selected: <Text style={styles.orangeText}>{vestingOption?.option}</Text>{'\n\n'}
            Duration: {matchingVesting.vestingDuration} months{'\n'}
            Description: {matchingVesting.description}{'\n'}
            Withdrawal Plan:{'\n'}
            {matchingVesting.monthlyWithdrawalPercentages.map((p, i) => (
              <Text key={i} style={styles.sectionDescription}>
                • Month {i + 1}: {p}%
              </Text>
            ))}
          </Text>
        </View>
      ) : (
        <View style={styles.sectionWithBg}>
          <Text style={styles.sectionTitle}>Commit to the Token Vesting Process</Text>
          <Text style={styles.sectionDescription}>You must commit to a lockup setting to proceed.</Text>
          <TouchableOpacity style={styles.faqButton} onPress={() => navigation.navigate('BTCYVesting', {
            currentVesting: vestingOption,
            vestingDetails
          })}>
            <Text style={styles.buttonText}>Start
              <Ionicons name="chevron-forward-outline" size={12} color={'#fff'} />
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isAllStepsComplete && !isSignedAcknowledgement && (
        <View style={[styles.sectionWithBg, { borderColor: 'green', borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: 'green' }]}>Sign Acknowledgement to Receive Tokens</Text>
          <Text style={[styles.sectionDescription, { color: 'green' }]}>Please sign the token acknowledgement to continue.</Text>
          <TouchableOpacity style={styles.faqButton} onPress={handleAcknowledgement}>
            <Text style={styles.buttonText}>Sign</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSignedAcknowledgement && (
        <View style={styles.sectionWithBg}>
          <Text style={styles.sectionTitle}>Acknowledgement Completed</Text>
          <Text style={styles.sectionDescription}>Acknowledged on: <Text style={styles.orangeText}>{new Date(ackDate).toLocaleString()}</Text></Text>
        </View>
      )}

      {isSignedAcknowledgement && migrationStatus && (
        <View style={styles.sectionWithBg}>
          <Text style={styles.sectionTitle}>Migration to Mainnet</Text>
          <Text style={styles.sectionDescription}>
            Status: <Text style={styles.orangeText}>{migrationStatus}</Text>{'\n'}
            {migrationDate && (
              <>Migrated on: <Text style={{ color: 'green' }}>{new Date(migrationDate).toLocaleString()}</Text>{'\n'}</>
            )}
            Your balance will be available after a 14-day pending period. Locked amounts follow your vesting period.
          </Text>
        </View>
      )}

      <View style={styles.sectionWithBg}>
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.sectionTitle}>Withdraw BTCY to Exchange Wallet</Text>
        </View>

        <Text style={styles.sectionDescription}>
          {walletAddress
            ? 'Your BTCY balance will be added to your Exchange Wallet for buying, converting, staking, and participating in Lotto.'
            : 'You need to create a BTCY wallet first before you can withdraw to your Exchange Wallet.'}
        </Text>

        {/* <TouchableOpacity
          style={[
            styles.faqButton,
            { backgroundColor: walletAddress ? '#FF8728' : '#888' },
          ]}
          onPress={withdrawBTCYToWallet}
          disabled={!walletAddress}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.buttonText}>
              {walletAddress ? 'Withdraw BTCY' : 'Wallet Required'}
            </Text>
            <Ionicons name="chevron-forward-outline" size={12} color={'#fff'} />
          </View>
        </TouchableOpacity>   */}
        <OvalButton label={walletAddress ? 'Withdraw BTCY' : 'Wallet Required'} IconInsideOval={WalletIcon} onPress={withdrawBTCYToWallet} disabled={!walletAddress}  />
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',

    color: '#d5d5d5',
  },
  description: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 16,
    color: '#d5d5d5',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 400,
    marginBottom: 16,
    color: '#FF8728',
  },
  sectionWithBg: {
    marginBottom: 24,
    color: '#d5d5d5',
    backgroundColor: '#252525',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',

    color: '#d5d5d5',
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 20,
    marginBottom: 8,
    color: '#d5d5d5',
  },
  sectionDescription: {
    fontSize: 12,
    marginBottom: 16,

    color: '#d5d5d5',
    lineHeight: 20,
  },
  orangeText: {
    color: '#FF8728',
  },
  button: {
    backgroundColor: '#007bff',
    marginBottom: 16,
  },
  faqButton: {
    backgroundColor: '#FF8728',
    padding: 10,
    // width: 65,
    height: 40,
    marginBottom: 10,
    //width: '100%', // Ensures button takes full width of parent container
    borderRadius: 10,
    alignItems: 'center',

    alignSelf: 'flex-start',

    // marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'medium',
    marginLeft: 5,
    fontSize: 12,
  },
});

export default TransferableBalance;
