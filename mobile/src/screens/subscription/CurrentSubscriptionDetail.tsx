import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { SubscriptionNavigationProp } from '../../navigation/types';
import { getUserMiningSubscriptionOrders, getUserMiningSubscriptionPlan } from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../../utils/jwt';
import OvalButton from '../../components/OvalButton';
import UpgradeIcon from '../../../assets/img/upgradeArrow.svg';
import ElectricPlan from '../../../assets/img/electric_plan.png';
import TurboPlan from '../../../assets/img/turbo_plan.png';
import NuclearPlan from '../../../assets/img/nuclear_plan.png';

const CurrentSubscriptionDetail = () => {
  const navigation = useNavigation<SubscriptionNavigationProp>();
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          Alert.alert('Error', 'Please login to view subscription details');
          return;
        }

        const userObj = decodeJWT(token);
        const email = userObj?.email;
        if (!email) return;

        // Fetch both subscription and orders in parallel
        const [subscriptionRes, ordersRes] = await Promise.all([
          getUserMiningSubscriptionPlan(email),
          getUserMiningSubscriptionOrders(email),
        ]);

        if (subscriptionRes?.status === 200) {
          setSubscription(subscriptionRes.data);
        }

        console.log(ordersRes.data, 'ordersRes.data');
        if (ordersRes?.status === 200) {
          const reversedOrders = [...ordersRes.data].reverse();
          setOrders(reversedOrders);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        console.log('Failed to fetch data:', err);
        Alert.alert('Error', 'Failed to load subscription data');
      } finally {
        setLoading(false);
        setOrdersLoading(false);
      }
    };

    fetchData();
  }, []);

  // useEffect(() => {
  //   const fetchSubscription = async () => {
  //     try {
  //       let email;
  //       const token = await AsyncStorage.getItem('userToken');
  //       if (token) {
  //         const userObj = decodeJWT(token);
  //         console.log('userObj:', userObj);
  //         email = userObj.email;
  //       } else {
  //         Alert.alert('Error', 'Please login to add phone number');
  //         return;
  //       }
  //       const response = await getUserMiningSubscriptionPlan(email);
  //       console.log('response:', response);
  //       if (response?.status === 200) {
  //         setSubscription(response.data);
  //       }
  //     } catch (err) {
  //       console.error('Failed to fetch subscription plan:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchSubscription();
  // }, []);

  const handleUpgradePlan = () => {
    navigation.navigate('Subscription');
  };

  const formatDate = (dateString: string) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' } as const;
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderPurchaseHistoryItem = (item: any) => {
    // Determine which icon to use based on plan name
    let iconSource;
    switch (item.breakdown.outCurrencyName.toLowerCase()) {
      case 'electric power':
        iconSource = ElectricPlan;
        break;
      case 'turbo power':
        iconSource = TurboPlan;
        break;
      case 'nuclear power':
        iconSource = NuclearPlan;
        break;
      default:
        iconSource = ElectricPlan; // default icon
    }

    return (
      <View key={item._id} style={styles.historyItem}>
        <View style={styles.historyLeftContent}>
          <View style={styles.iconContainer}>
            <Image source={iconSource} style={styles.icon} />
          </View>
          <View>
            <Text style={styles.planName}>{item.breakdown.outCurrencyName} Plan</Text>
            {item.status === "Completed" ?
              (<Text style={styles.planDate}>
                {formatDate(item.created)} - {formatDate(item.expirationDate)}
              </Text>)
              : (
                <Text style={styles.planDate}>
                  Order Status: {item.status}
                </Text>
              )}
          </View>
        </View>
        <View style={[styles.statusBadge, styles.priceBadge]}>
          <Text style={styles.statusText}>
            ${item.breakdown.inAmount || item.cost || '0'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.content}>
          <Text style={styles.title}>Active Subscription</Text>
          {loading ? (
            <Text style={styles.value}>Loading subscription...</Text>
          ) : subscription ? (
            <View style={styles.planDetails}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>Current Plan</Text>
                  <Text style={styles.value}>{subscription.plan} Plan</Text>
                </View>
                <View>
                  <Text style={styles.label}>Price</Text>
                  <Text style={styles.value}>
                    {subscription.cost === 0
                      ? 'Free'
                      : `$${subscription.cost} /Month`}
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>Billing Period</Text>
                  <Text style={styles.value}>
                    {subscription.plan === 'Free' ? 'Not Available' : 'Monthly'}
                  </Text>
                </View>

                <View>
                  <Text style={styles.label}>Next Renewal</Text>
                  <Text style={styles.value}>
                    {subscription.plan === 'Free'
                      ? 'Not Available'
                      : formatDate(subscription.endDate)}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.value}>No subscription found</Text>
          )}
          <View style={styles.buttonContainer}>
            {/* <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgradePlan}>
            <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
          </TouchableOpacity> */}
            <OvalButton
              label="Upgrade Plan"
              IconInsideOval={UpgradeIcon}
              onPress={handleUpgradePlan}
            />
          </View>

          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>My Purchasing History</Text>
            {ordersLoading ? (
              <Text style={styles.value}>Loading history...</Text>
            ) : orders.length > 0 ? (
              <View style={styles.historyList}>
                {orders.map(renderPurchaseHistoryItem)}
              </View>
            ) : (
              <Text style={styles.value}>No purchase history found</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
    marginBottom: 24,
  },
  planDetails: {
    gap: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 32,
    gap: 12,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  changePaymentButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  changePaymentText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  historySection: {
    marginTop: 32,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
    marginBottom: 16,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 16,
  },
  historyLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
  },
  icon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  planName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  planDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceBadge: {
    backgroundColor: '#FF6B00',
  },
  renewBadge: {
    backgroundColor: '#2E2E2E',
  },
  statusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default CurrentSubscriptionDetail;
