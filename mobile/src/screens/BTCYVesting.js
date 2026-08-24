import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../utils/jwt';
import { updateVesting } from '../services/auth.service';

const VestingScreen = () => {
  const route = useRoute();
  const { currentVesting, vestingDetails } = route.params || {};

  const [autoLock, setAutoLock] = useState(true);
  const [loading, setLoading] = useState(false);
  const miningSessions = 482;

  const [selectedOption, setSelectedOption] = useState(null);
  const [lockupPercentage, setLockupPercentage] = useState(0);
  const [lockupDuration, setLockupDuration] = useState(0);
  const [originalLockupPercentage, setOriginalLockupPercentage] = useState(0);
  const [originalLockupDuration, setOriginalLockupDuration] = useState(0);
  const [showUpdateButton, setShowUpdateButton] = useState(false);

  useEffect(() => {
    if (vestingDetails && currentVesting) {
      const matched = vestingDetails.find(v => v.option === currentVesting);
      if (matched) {
        setSelectedOption(matched);
        const avg = Math.round(
          matched.monthlyWithdrawalPercentages.reduce((a, b) => a + b, 0) /
            matched.monthlyWithdrawalPercentages.length
        );
        setLockupPercentage(avg);
        setLockupDuration(matched.vestingDuration);
        setOriginalLockupPercentage(avg);
        setOriginalLockupDuration(matched.vestingDuration);
      }
    }
  }, [currentVesting, vestingDetails]);

  const calculateBoost = (percent, months, sessions) => {
    const p = percent / 100;
    const durationFactor = months / 18;
    return (p * durationFactor * Math.log(sessions)).toFixed(2);
  };

  const handleUpdateVesting = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const user = decodeJWT(token);
      const email = user?.email;
  
      if (!selectedOption) {
        return Alert.alert('Error', 'Please select a vesting plan.');
      }
  
      const res = await updateVesting(email, selectedOption.option);
  
      console.log('Vesting Update Response:', res);
      if (res?.status === 200 && res?.data?.option) {
        const nextChangeDate = new Date(res.data.nextChangeAllowed).toLocaleDateString();
        Alert.alert(
          'Success',
          `Vesting plan updated to "${res.data.option}".\nNext change: ${nextChangeDate}`
        );
        setOriginalLockupPercentage(lockupPercentage);
        setOriginalLockupDuration(lockupDuration);
        setShowUpdateButton(false);
      } else {
        // Handle non-200 responses
        const serverMessage = res?.data?.message || 'An unexpected error occurred';
        Alert.alert('Error', serverMessage);
      }
    } catch (err) {
      // Handle network/unknown errors
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Update failed';
      console.log('Vesting Update Error:', errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    const shouldShow =
      lockupPercentage !== originalLockupPercentage ||
      lockupDuration !== originalLockupDuration;
    setShowUpdateButton(shouldShow);
  }, [
    lockupPercentage,
    lockupDuration,
    originalLockupPercentage,
    originalLockupDuration,
  ]);

  const renderSliderLabels = (points, suffix = '') => (
    <View style={styles.sliderLabelsContainer}>
      {points.map((point, i) => (
        <Text key={i} style={styles.sliderLabel}>
          {point}{suffix}
        </Text>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>BTCY Vesting System & Commitment</Text>
      <Text style={styles.description}>
        This system ensures fair BTCY distribution, prevents excessive sell-offs, and requires users to commit to vesting, similar to Pi Network mining.
      </Text>

      {/* Available Plans */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Available Vesting Plans</Text>
        {vestingDetails?.map((plan, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              setSelectedOption(plan);
              const avg = Math.round(
                plan.monthlyWithdrawalPercentages.reduce((a, b) => a + b, 0) /
                  plan.monthlyWithdrawalPercentages.length
              );
              setLockupPercentage(avg);
              setLockupDuration(plan.vestingDuration);
            }}
            style={styles.radioItem}
          >
            <View style={styles.radioCircle}>
              {selectedOption?.option === plan.option && <View style={styles.radioDot} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardText}>
                <Text style={{ fontWeight: 'bold' }}>{plan.option}</Text>: {plan.description}
              </Text>
              <Text style={styles.cardText}>Duration: {plan.vestingDuration} months</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lockup Controls */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Configure Lockup Settings</Text>

        <View style={styles.rowBetween}>
          <Text style={styles.cardText}>Auto-lock future transfers</Text>
          <Switch value={autoLock} onValueChange={setAutoLock} />
        </View>

        <Text style={[styles.cardText, { marginTop: 20 }]}>Lockup Percentage: {lockupPercentage}%</Text>
        <Slider
          minimumValue={25}
          maximumValue={200}
          step={5}
          value={lockupPercentage}
          onValueChange={setLockupPercentage}
          minimumTrackTintColor="#FF8728"
          maximumTrackTintColor="#888"
        />
        {renderSliderLabels([25, 50, 75, 100], '%')}

        <Text style={[styles.cardText, { marginTop: 20 }]}>Lockup Duration: {lockupDuration} months</Text>
        <Slider
          minimumValue={1}
          maximumValue={36}
          step={1}
          value={lockupDuration}
          onValueChange={setLockupDuration}
          minimumTrackTintColor="#FF8728"
          maximumTrackTintColor="#888"
        />
        {renderSliderLabels([3, 6, 9, 12], 'm')}

        <Text style={styles.cardText}>
          Estimated Boost: <Text style={styles.orangeText}>+{calculateBoost(lockupPercentage, lockupDuration, miningSessions)}%</Text>
        </Text>
        <Text style={styles.cardText}>
          Sessions completed: <Text style={styles.orangeText}>{miningSessions}</Text>
        </Text>

        {showUpdateButton && (
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateVesting}
            disabled={loading}
            loading={loading}
          >
            <Text style={styles.updateButtonText}>Update Vesting</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Plan Detail */}
      {selectedOption && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected Plan: {selectedOption.option}</Text>
          <Text style={styles.cardText}>Duration: {selectedOption.vestingDuration} months</Text>
          <Text style={styles.cardText}>Description: {selectedOption.description}</Text>
          <Text style={[styles.cardText, { marginTop: 10 }]}>Withdrawal Schedule:</Text>
          {selectedOption.monthlyWithdrawalPercentages.map((p, i) => (
            <Text key={i} style={styles.cardText}>• Month {i + 1}: {p}%</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: '#d5d5d5',
    lineHeight: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#252525',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 12,
    color: '#d5d5d5',
    marginBottom: 4,
  },
  orangeText: {
    color: '#FF8728',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 10,
    color: '#999',
    width: 35,
    textAlign: 'center',
  },
  updateButton: {
    backgroundColor: '#FF8728',
    marginTop: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FF8728',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#FF8728',
  },
});

export default VestingScreen;
