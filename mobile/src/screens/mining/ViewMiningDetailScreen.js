import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  Share,
  UIManager,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentMiningRewards,
  getMiningStatus,
} from '../../services/auth.service';
import Button from '../../components/Button';
import { decodeJWT } from '../../utils/jwt';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const InfoRow = ({ label, value, subValue, onPress, expanded, explanation }) => (
  <View>
    <TouchableOpacity style={styles.infoRow} onPress={onPress}>
      <View style={styles.infoLabelContainer}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={colors.textSecondary}
        />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <View style={styles.infoValueContainer}>
        <Text style={styles.infoValue}>{value}</Text>
        {subValue && <Text style={styles.infoSubValue}>{subValue}</Text>}
        {onPress && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textSecondary}
          />
        )}
      </View>
    </TouchableOpacity>
    {expanded && explanation && (
      <View style={styles.explanationContainer}>
        <Text style={styles.explanationText}>{explanation}</Text>
      </View>
    )}
  </View>
);

const RateBox = ({ label, value, isHighlighted }) => (
  <View style={[styles.rateBox, isHighlighted && styles.rateBoxHighlighted]}>
    <Text style={styles.rateLabel}>{label}</Text>
    <Text style={styles.rateValue}>{value}</Text>
  </View>
);

const ViewMiningDetailScreen = () => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [miningData, setMiningData] = useState({
    isActive: false,
    balance: 0,
    startTime: null,
    remainingTime: 0,
    miningRate: 0,
    speedBoost: 1,
    estimatedRewards: 0,
    totalMined: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);
  // Referral code for the share sheet; read from the same token the mining
  // calls are keyed on so the link always belongs to the signed-in miner.
  const [userData, setUserData] = useState(null);

  // Format time to HH:MM:SS
  const formatTime = seconds => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':');
  };

  // Calculate remaining time
  const calculateRemainingTime = (startTime, duration) => {
    if (!startTime) return duration;
    const now = new Date();
    const start = new Date(startTime);
    const elapsedSeconds = Math.floor((now - start) / 1000);
    return Math.max(0, duration - elapsedSeconds);
  };

  // Update timer and calculate current earnings
  const updateMiningStats = () => {
    setMiningData(prev => {
      if (!prev.isActive || !prev.startTime) return prev;

      const newRemaining = calculateRemainingTime(prev.startTime, 24 * 60 * 60);
      const elapsedHours = (24 * 60 * 60 - newRemaining) / 3600;
      const currentEarnings =
        elapsedHours * (prev.miningRate * prev.speedBoost);

      return {
        ...prev,
        remainingTime: newRemaining,
        estimatedRewards: currentEarnings,
        totalMined: prev.balance + currentEarnings,
      };
    });
  };

  // Fetch all mining data
  const fetchMiningData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userObj = decodeJWT(token);
        const userEmail = userObj?.email;
        setUserData(userObj);

        const [statusResponse, rewardsResponse] = await Promise.all([
          getMiningStatus(userEmail),
          getCurrentMiningRewards(userEmail),
        ]);

        if (statusResponse.status === 200 && rewardsResponse.status === 200) {
          const statusData = statusResponse.data;
          const rewardsData = rewardsResponse.data;

          const newData = {
            isActive: statusData?.isMiningActive || false,
            balance: statusData?.totalMined || 0,
            startTime: statusData?.startTime,
            miningRate: rewardsData?.miningRateObj?.miningRate || 0,
            speedBoost: rewardsData?.miningRateObj?.speedBoost || 1,
            estimatedRewards: rewardsData?.estimatedRewards || 0,
            totalMined: statusData?.totalMined || 0,
          };

          newData.remainingTime = calculateRemainingTime(
            newData.startTime,
            24 * 60 * 60, // 24 hours in seconds
          );

          setMiningData(newData);

          // Start timer if mining is active
          if (newData.isActive && newData.startTime) {
            if (timerInterval) clearInterval(timerInterval);
            const interval = setInterval(updateMiningStats, 1000);
            setTimerInterval(interval);
          }
        } else {
          setError('Failed to fetch mining data');
        }
      }
    } catch (err) {
      console.error('Error fetching mining details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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

  const toggleSection = section => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={() => setLoading(true)} />
      </View>
    );
  }


  const handleShareReferral = async () => {
    try {
      const message = `Hey! Join Bitcoin yay and start mining with me. Use my referral link to sign up: https://bitcoinyay.com/referral=${userData?.referralCode || 'Robert90'
        }`;

      await Share.share({
        message,
        title: 'Join Bitcoin yay!',
      });
    } catch (error) {
      console.log('Error sharing referral code:', error);
    }
  };


  // Calculate boosted mining rate
  const boostedRate = miningData.miningRate * miningData.speedBoost;
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sessionInfo}>
          {miningData.isActive
            ? `Mining Session ends in ${formatTime(miningData.remainingTime)}`
            : 'Mining is not active'}
        </Text>
        {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.title}>Total Mining Rate:</Text>
          <Text style={styles.totalRate}>
            {miningData?.totalRate?.toFixed(4) || '0.0000'}{' '}
            <Text style={{ color: colors.primary }}>BTCY/Hr</Text>
          </Text>
        </View> */}

        <View style={styles.rateBoxesContainer}>
          <RateBox
            label="Base Rate"
            value={`${miningData.miningRate.toFixed(2)} BTCY/Hr`}
          />
          <RateBox label="Speed Boost" value={`${miningData.speedBoost}x`} />
          <RateBox
            label="Boosted Rate"
            value={`${boostedRate.toFixed(2)} BTCY/Hr`}
            isHighlighted
          />
        </View>

        <View style={styles.detailsContainer}>
          <InfoRow
            label="Current Balance"
            value={`${miningData.balance.toFixed(5)} BTCY`}
            subValue=""
            onPress={() => toggleSection('balance')}
            expanded={expandedSection === 'balance'}
            explanation="Your current mined balance that can be claimed"
          />

          <InfoRow
            label="Estimated Rewards"
            value={`${(
              Number(miningData.balance) + Number(miningData.estimatedRewards)
            ).toFixed(5)} BTCY`}
            onPress={() => toggleSection('rewards')}
            expanded={expandedSection === 'rewards'}
            explanation="Estimated rewards from current mining session"
          />
          {expandedSection === 'booster' && (
            <View style={styles.boosterDetails}>
              <View style={styles.boosterRow}>
                <Text style={styles.boosterLabel}>Gophers</Text>
                <Text style={styles.boosterValue}>
                  {miningData.miningRate.toFixed(2)} BTCY/day
                </Text>
              </View>
              <View style={styles.boosterRow}>
                <Text style={styles.boosterLabel}>Speed Boost</Text>
                <Text style={styles.boosterValue}>
                  {miningData.speedBoost}x
                </Text>
              </View>
              <View style={styles.boosterRow}>
                <Text style={styles.boosterLabel}>Time Remaining</Text>
                <Text style={styles.boosterValue}>
                  {formatTime(miningData.remainingTime)}
                </Text>
              </View>

              <Text style={styles.boosterSubtext}>
                Your lockup reward is based on the amount of bitcoin yay is
                locked up in duration.
              </Text>
              <TouchableOpacity style={styles.configureButton}>
                <Text style={styles.configureButtonText}>Configure</Text>
              </TouchableOpacity>
            </View>
          )}

          <InfoRow
            label="Rewards"
            value="1.00"
            onPress={() => toggleSection('rewards')}
            expanded={expandedSection === 'rewards'}
          />
          {expandedSection === 'rewards' && (
            <View style={styles.rewardsDetails}>
              <View style={styles.boosterRow}>
                <Text style={styles.boosterLabel}>Gophers</Text>
                <Text style={styles.boosterValue}>100%</Text>
              </View>
              <View style={styles.boosterRow}>
                <Text style={styles.boosterLabel}>Referral Team</Text>
                <View style={styles.boosterValueContainer}>
                  <Text style={styles.boosterValue}>0 × 0.25% =</Text>
                  <Text style={styles.highlightedValue}>+0.00%</Text>
                </View>
              </View>
              <Text style={styles.boosterSubtext}>
                You have invited 0 people, out of which 0 are currently mining.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={[styles.actionButtonText, {color: 'white'}]}>
                    Ping Active
                  </Text>
                </TouchableOpacity>{' '}
                <TouchableOpacity
                  onPress={handleShareReferral}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: colors.primary,
                      borderWidth: 1,
                    },
                  ]}>
                  <Text
                    style={[styles.actionButtonText, { color: colors.primary }]}>
                    Invite More
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.utilitySection}>
                <View style={styles.boosterRow}>
                  <Text style={styles.boosterLabel}>Utility Usage Bonus</Text>
                  <Text style={styles.highlightedValue}>0.00%</Text>
                </View>
                <Text style={styles.utilityText}>
                  <Text style={{ color: 'green' }}>
                    Tuning in progress. The value may change.
                  </Text>
                  {'\n'}
                  Based on the Bitcoin yay ecosystem and use cases.
                </Text>
              </View>

              <View style={styles.utilitySection}>
                <View style={styles.boosterRow}>
                  <Text style={styles.boosterLabel}>Utility Usage Bonus</Text>
                  <Text style={styles.highlightedValue}>0.00%</Text>
                </View>
                <Text style={styles.utilityText}>
                  Tuning in progress. The value may change.
                  {'\n'}
                  This bonus is computed based on the industry and accessibility
                  of the node you are running.
                  <Text style={styles.link}> Tell Me More</Text>
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24, // Add extra padding at the bottom for better scrolling
  },
  sessionInfo: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textSecondary,
    fontSize: 24,
    marginBottom: 8,
  },
  totalRate: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  rateBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 10,
  },
  rateBox: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  rateBoxHighlighted: {
    backgroundColor: colors.primary,
  },
  rateLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  rateValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsContainer: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    marginRight: 8,
  },
  infoSubValue: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  boosterDetails: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  boosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boosterLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  boosterValue: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  boosterValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightedValue: {
    color: colors.primary,
    fontSize: 14,
    marginLeft: 4,
  },
  boosterSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  configureButton: {
    backgroundColor: colors.cardBackground,
    padding: 8,
    borderRadius: 8,
    flex: 1,
    borderColor: colors.primary,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  configureButtonText: {
    color: colors.primary,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
  },
  utilitySection: {
    marginTop: 16,
  },
  utilityText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  rewardsDetails: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  explanationContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginTop: -8,
  },
  explanationText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ViewMiningDetailScreen;
