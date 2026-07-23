import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions, // Added Image component
  Platform,
  Alert,
  Linking,
} from 'react-native';
import Swiper from 'react-native-swiper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Button from '../../components/Button';
import FreePlanIcon from '../../../assets/img/free_plan.png';
import ElectricPlanIcon from '../../../assets/img/electric_plan.png';
import TurboPlanIcon from '../../../assets/img/turbo_plan.png';
import NuclearPlanIcon from '../../../assets/img/nuclear_plan.png';
import {useNavigation} from '@react-navigation/native';
import freePlanArt from '../../../assets/img/free_plan_art.png';
import electricPlanArt from '../../../assets/img/eletric_plan_art.png';
import turboPlanArt from '../../../assets/img/trubo_plan_art.png';
import nuclearPlanArt from '../../../assets/img/nuclear_plan_art.png';
import LeftArrow from '../../../assets/splash/arrow-left.svg';
import RightArrow from '../../../assets/splash/arrow-right.svg';
import {getUserMiningSubscriptionPlan} from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {decodeJWT} from '../../utils/jwt';
import OvalButton from '../../components/OvalButton';
import BellIcon from '../../../assets/img/BellIcon.svg';
import ChoosePlanIcon from '../../../assets/img/choosePlanIcon.svg';
import Config from 'react-native-config';
import { getAllMiningPlans, createMiningSubscriptionPlanOrder } from '../../services/auth.service';
import { requestSubscription } from '../../services/iap.service';
// import { getSubscriptions } from 'react-native-iap';

const basePlans = [
  {
    key: 'Free',
    title: 'Snatch Mining Power',
    icon: FreePlanIcon,
    image: freePlanArt,
    mainText:'$0',
    data: [
      'Speed Boost 1x',
      '~3 BTCY/hour',
      'No Hidden Fees',
      'Instant Withdrawals',
      'User-Friendly Mining',
      'Secure & Reliable',
      'Referral Bonuses',
      '24/7 Support',
    ],
  },
  {
    key: 'Electric',
    title: 'Electric Mining Plan',
    icon: ElectricPlanIcon,
    image: electricPlanArt,
    mainText:'$100',
    data: [
      'Speed Boost 3x',
      '~9 BTCY/hour',
      'Priority Transactions',
      'Faster Payouts',
      'Exclusive Promotions',
      'Secure & Reliable',
      'Bonus Rewards',
      'Priority Support',
    ],
  },
  {
    key: 'Turbo',
    title: 'Turbo Mining Plan',
    icon: TurboPlanIcon,
    image: turboPlanArt,
    mainText:'$300',
    data: [
      'Speed Boost 6x',
      '~18 BTCY/hour',
      'Priority Withdrawals',
      'Faster Payouts',
      'Early Access to Promotions',
      'Secure & Reliable',
      'Exclusive Bonus Rewards',
      'VIP Support',
    ],
  },
  {
    key: 'Nuclear',
    title: 'Nuclear Mining Plan',
    icon: NuclearPlanIcon,
    image: nuclearPlanArt,
    mainText:'$600',
    data: [
      'Speed Boost 9x',
      '~27 BTCY/hour',
      'Fast Instant Withdrawals',
      'Faster Payouts',
      'Lifetime Loyalty Rewards',
      'Enhance Security',
      'Exclusive Bonus Rewards',
      'Premium VIP Support',
    ],
  },
];
const {height} = Dimensions.get('window');

const CarouselComponent = () => {


  const [index, setIndex] = useState(0);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        let email;
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userObj = decodeJWT(token);
          email = userObj.email;
        } else {
          Alert.alert('Error', 'Please login to view subscription');
          return;
        }

        const response = await getUserMiningSubscriptionPlan(email);
        console.log('Subscription response:', response);
        if (response?.status === 200) {
          console.log('response.data', response.data);
          setCurrentPlan(response.data.plan); // "Free", "Silver", etc.
        }
      } catch (err) {
        console.error('Failed to fetch subscription plan:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const plans = basePlans.map(plan => {
    let extraData = [];
    switch (plan.key) {
      case 'Electric':
        extraData = [
          'Price: $100/month',
          'Duration: 1 Month',
          'Mining Rate: ~9 BTCY/hour',
        ];
        return {
          ...plan,
          data: [...plan.data, ...extraData],
        };
      case 'Turbo':
        extraData = [
          'Price: $300/month',
          'Duration: 1 Month',
          'Mining Rate: ~18 BTCY/hour',
        ];
        return {
          ...plan,
          data: [...plan.data, ...extraData],
        };
      case 'Nuclear':
        extraData = [
          'Price: $600/month',
          'Duration: 1 Month',
          'Mining Rate: ~27 BTCY/hour',
        ];
        return {
          ...plan,
          data: [...plan.data, ...extraData],
        };
      default:
        return plan; // Free plan unchanged
    }
  });

  
  
  
  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const handleNext = () => {
    if (index < plans.length - 1) {
      setIndex(index + 1);
    }
  };

  const handleSubscribe = async (planKey) => {
    try {
      setIsProcessing(true);
      // Fetch plan details for amount
      const plansRes = await getAllMiningPlans();
      console.log('plansRes', plansRes);
      if (!plansRes?.status === 200 || !Array.isArray(plansRes.data)) {
        Alert.alert('Error', 'Failed to fetch plans');
        setIsProcessing(false);
        return;
      }
      const normalizedPlanName = planKey.toLowerCase().trim();
      console.log('normalizedPlanName', normalizedPlanName);
      const match = plansRes.data.find(
        (p) => p.name.toLowerCase().includes(normalizedPlanName)
      );
      console.log('match', match);
      if (!match) {
        Alert.alert('Error', 'No plan matched');
        setIsProcessing(false);
        return;
      }
      const amount = `$${parseFloat(match.cost).toFixed(2)}`;
      console.log('amount', amount);
      const numericAmount = parseFloat(match.cost);
      const planName = planKey;
      console.log('planName', planName);

      if (Config.USE_FAKE_PAYMENT === 'true') {
        setTimeout(() => {
          navigation.navigate('PaymentSuccessful', {
            amount,
            planName,
            paymentMethod: 'Fake Payment',
          });
        }, 1000);
        setIsProcessing(false);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      console.log('token', token);
      if (!token) {
        Alert.alert('Error', 'User not logged in');
        setIsProcessing(false);
        return;
      }
      const userObj = decodeJWT(token);
      const email = userObj.email;

      const planSkuMap = {
        Electric: {
          ios: 'btcy.electric.power',
          android: 'btcy.electric.android',
          basePlanId: 'token-electric-123',
          offerToken: 'offer-eletric-android',
        },
        Turbo: {
          ios: 'btcy.turbo.power',
          android: 'btcy.turbo.android',
          basePlanId: 'token-turbo-456',
          offerToken: 'offer-tubro-android',
        },
        Nuclear: {
          ios: 'btcy.nuclear.power',
          android: 'btcy.nuclear.android',
          basePlanId: 'token-nuclear-789',
          offerToken: 'offer-nuclear-android',
        },
      };
      console.log('planSkuMap', planSkuMap);
      if (planName === 'Free') {
        Alert.alert('Info', 'You are already on the Free plan.');
        setIsProcessing(false);
        return;
      }
      const planSkus = planSkuMap[planName];
      console.log('planSkus', planSkus);
      if (!planSkus) {
        Alert.alert('Error', 'Invalid plan selected');
        setIsProcessing(false);
        return;
      }
      const sku = Platform.OS === 'ios' ? planSkus.ios : planSkus.android;
      console.log('sku', sku);
      let products = [];
      try {
        products = await getSubscriptions({ skus: [sku] });
        console.log('products', products);
        if (!products || products.length === 0) {
          throw new Error('Product not available in store');
        }
      } catch (fetchError) {
        Alert.alert('Error', 'Failed to load products. Please try again later.');
        setIsProcessing(false);
        return;
      }
      const basePlanId = planSkus.basePlanId;
      let matchedOffer;
      let offerToken;
      if (Platform.OS === 'android') {
        const subscriptionOffers = products[0]?.subscriptionOfferDetails || [];
        matchedOffer = subscriptionOffers.find(
          (offer) => offer.basePlanId === basePlanId
        );
        if (!matchedOffer) {
          Alert.alert('Error', 'No matching subscription offer found for base plan');
          setIsProcessing(false);
          return;
        }
        offerToken = matchedOffer.offerToken;
        if (!offerToken) {
          Alert.alert('Error', 'Offer token missing for matched subscription');
          setIsProcessing(false);
          return;
        }
      }
      let purchaseResult;
      try {
        if (Platform.OS === 'android') {
          purchaseResult = await requestSubscription(
            sku,
            offerToken,
            planSkus.basePlanId,
            matchedOffer.pricingPhases.pricingPhaseList
          );
        } else {
          purchaseResult = await requestSubscription(sku);
        }
      } catch (purchaseError) {
        Alert.alert('Payment Failed', purchaseError.message || 'Unknown error');
        setIsProcessing(false);
        return;
      }
      const purchase = Array.isArray(purchaseResult) ? purchaseResult[0] : purchaseResult;
      if (!purchase) {
        Alert.alert('Payment Failed', 'Payment not completed');
        setIsProcessing(false);
        return;
      }
      let receiptData = '';
      let platformData = {};
      if (Platform.OS === 'ios') {
        receiptData = purchase.transactionReceipt;
        platformData = {
          appleTransactionId: purchase.transactionId,
          originalTransactionId: purchase.originalTransactionIdentifierIOS,
          productId: purchase.productId,
        };
      } else if (Platform.OS === 'android') {
        receiptData = String(purchase.purchaseToken);
        platformData = {
          packageName: purchase.packageNameAndroid,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
        };
      }
      if (!receiptData) {
        Alert.alert('Error', 'Missing receipt data');
        setIsProcessing(false);
        return;
      }
      // Send receiptData to backend
      const response = await createMiningSubscriptionPlanOrder(
        email,
        planName + ' Power',
        numericAmount,
        Platform.OS === 'ios' ? 'App Store IAP' : 'Play Store IAP',
        false,
        receiptData,
        platformData
      );
      if (response.status === 200) {
        navigation.navigate('PaymentSuccessful', {
          amount,
          planName,
          paymentMethod: Platform.OS === 'ios' ? 'App Store IAP' : 'Play Store IAP',
        });
      } else {
        Alert.alert('Order Error', response.data || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Payment Failed', error.message || 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <Swiper
        loop={false}
        index={index}
        autoplay={false}
        showsPagination={false}
        onIndexChanged={i => setIndex(i)}
        style={styles.swiper}>
        {plans.map((plan, i) => (
          <ScrollView
            key={i}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <View style={styles.slide}>
              <View style={styles.header}>
                <TouchableOpacity onPress={handlePrev} disabled={index === 0}>
                  <LeftArrow />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                  <View style={styles.iconContainer}>
                    <Image
                      source={plan.icon}
                      style={styles.planIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.text}>{plan.title}</Text>
                </View>

                <TouchableOpacity
                  onPress={handleNext}
                  disabled={index === plans.length - 1}>
                  <RightArrow />
                </TouchableOpacity>
              </View>

              <View style={styles.imageContainer}>
                <Image
                  source={plan.image}
                  style={styles.planImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.badgeContainer}>
                <Text style={styles.mainText}>{plan.mainText}</Text>
                <Text style={styles.badgeText}>{plan.offText}</Text>
              </View>

              <View style={styles.listContainer}>
                {plan.data.map((item, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Ionicons
                      name="ellipse"
                      size={8}
                      color={'#fff'}
                      style={{marginRight: 10}}
                    />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        ))}
      </Swiper>

      {/* Fixed Button Container */}
      <View style={styles.fixedButtonContainer}>
      
        <OvalButton
          label={
            isProcessing ? 'Processing...' : plans[index]?.key === currentPlan ? 'Current Plan' : 'Subscribe'
          }
          IconInsideOval={ plans[index]?.key === currentPlan ? ChoosePlanIcon : BellIcon}
          disabled={plans[index]?.key === currentPlan}
          onPress={() => {
            if (plans[index].key !== currentPlan) {
              handleSubscribe(plans[index].key);
            }
          }}
          isLoading={isProcessing}
          size="big"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  swiper: {
    height: height, // Reserve space for fixed button
  },
  scrollContent: {
    paddingBottom: 100, // Make space for fixed button
  },
  slide: {
    padding: 20,
    paddingBottom: 30,
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  iconContainer: {
    height: 60,
    width: 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planIcon: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D5D5D5',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  planDetailsContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  boostText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rateText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 5,
  },
  durationText: {
    color: '#bbb',
    fontSize: 14,
  },
  descText: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 10,
  },

  badgeContainer: {
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 10,
  },
  badgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  fixedButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
});

export default CarouselComponent;
