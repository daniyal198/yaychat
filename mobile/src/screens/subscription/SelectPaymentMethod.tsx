import React, { useEffect, useState } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import { colors } from '../../theme/colors';
import Config from 'react-native-config';
import { SubscriptionNavigationProp } from '../../navigation/types';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { Platform } from 'react-native';
import Star from '../../../assets/img/star_icon.svg';
import {
  createMiningSubscriptionPlanOrder,
  getAllMiningPlans,
} from '../../services/auth.service';
import { decodeJWT } from '../../utils/jwt';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GopherOne from '../../../assets/splash/one-gopher.svg';
import GopherThree from '../../../assets/splash/threeGopher.svg';
import GopherSix from '../../../assets/splash/six-gopher.svg';
import GopherNine from '../../../assets/splash/NineGopher.svg';
import OvalButton from '../../components/OvalButton';
import ArrowRightIcon from '../../../assets/img/arrowRight.svg';
//import { requestSubscription } from '../../services/iap.service';
// import { getSubscriptions } from 'react-native-iap';

type PaymentMethod = {
  id: string;
  name: string;
  Icon: React.FC<any>;
};

const paymentMethods: PaymentMethod[] = Platform.select({
  ios: [
    {
      id: 'subscription-ios',
      name: 'App Store (Subscription)',
      Icon: Star,
    },
  ],
  android: [
    {
      id: 'subscription-android',
      name: 'Play Store (Subscription)',
      Icon: Star,
    },
  ],
  default: [],
})!;

type SelectPaymentRouteParams = {
  planName: string;
  amount: string;
};

const planImages: Record<string, React.FC<any>> = {
  Free: GopherOne,
  Electric: GopherThree,
  Turbo: GopherSix,
  Nuclear: GopherNine,
};

const SelectPaymentMethod = () => {
  const navigation = useNavigation<SubscriptionNavigationProp>();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedMethod, _setSelectedMethod] = useState<PaymentMethod | null>(paymentMethods[0]);
  const route =
    useRoute<RouteProp<{ params: SelectPaymentRouteParams }, 'params'>>();
  const { planName } = route.params;
  const [amount, setAmount] = useState('0');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const numericAmount = Number(amount.replace(/[^0-9.]/g, ''));

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    const fetchPlansAndSetAmount = async () => {
      try {
        if (!planName) {
          console.warn('planName is undefined');
          return;
        }

        const plansRes = await getAllMiningPlans();
        console.log('Fetched Plans:', plansRes);

        if (plansRes?.status === 200 && Array.isArray(plansRes.data)) {
          const plans = plansRes.data;

          const normalizedPlanName = planName.toLowerCase().trim();

          const match = plans.find((p: any) =>
            p.name.toLowerCase().includes(normalizedPlanName),
          );

          if (match) {
            setSelectedPlan(match);
            setAmount(`$${parseFloat(match.cost).toFixed(2)}`);
            console.log('Matched Plan:', match);
          } else {
            console.warn(`No plan matched for planName: "${planName}"`);
          }
        }
      } catch (err) {
        console.error('Failed to fetch mining plans:', err);
      }
    };

    fetchPlansAndSetAmount();
  }, [planName]);

  const handleContinue = async () => {
    try {

      console.log("Handle Continue", selectedMethod, isProcessing);
      if (!selectedPlan) {
        Alert.alert('Error', 'No plan selected');
        return;
      }

      setIsProcessing(true);

      if (Config.USE_FAKE_PAYMENT === 'true') {
        console.log('Using FAKE payment');

        // Simulate fake success
        setTimeout(() => {
          navigation.navigate('PaymentSuccessful', {
            amount,
            planName,
            paymentMethod: selectedMethod?.name || 'Fake Payment',
          });
        }, 1000);

        return; // 🚀 stop here, don't run real payment
      }

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const userObj = decodeJWT(token);
      const email = userObj.email;

      const planSkuMap: { [key: string]: { ios: string; android: string, offerToken: string, basePlanId: string } } = {
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

      const planSkus = planSkuMap[planName];
      if (!planSkus) {
        Alert.alert('Error', 'Invalid plan selected');
        return;
      }

      const sku = Platform.OS === 'ios' ? planSkus.ios : planSkus.android;

      console.log('Selected SKU:', sku);
      let products: any[] = [];
      try {
        products = [] //await getSubscriptions({ skus: [sku] });
        if (!products || products.length === 0) {
          throw new Error('Product not available in store');
        }
        console.log('Available products:', products);
      } catch (fetchError) {
        console.error('Failed to fetch products:', fetchError);
        throw new Error('Failed to load products. Please try again later.');
      }

      const basePlanId = planSkus.basePlanId; // because your basePlanId = android sku
      let matchedOffer;
      console.log("basePlanId", basePlanId)
      let offerToken: string | undefined;

      if (Platform.OS === 'android') {
        const subscriptionOffers = products[0]?.subscriptionOfferDetails || [];

        matchedOffer = subscriptionOffers.find(
          (offer: any) => offer.basePlanId === basePlanId
        );

        console.log("Matched Offer", matchedOffer)
        if (!matchedOffer) {
          throw new Error('No matching subscription offer found for base plan');
        }

        offerToken = matchedOffer.offerToken;

        if (!offerToken) {
          throw new Error('Offer token missing for matched subscription');
        }
      }


      let purchaseResult;

      console.log('Attempting purchase with:', { sku, offerToken, basePlanId, matchedOffer });
      if (Platform.OS === 'android') {
        // Android must pass SKU + offerToken
        purchaseResult = {};//await requestSubscription(sku, offerToken, planSkus.basePlanId, matchedOffer.pricingPhases.pricingPhaseList);
      } else {
        // iOS only needs SKU
        purchaseResult = {}; //await requestSubscription(sku);
      }

      const purchase = Array.isArray(purchaseResult) ? purchaseResult[0] : purchaseResult;
      if (!purchase) {
        throw new Error('Payment not completed');
      }

      console.log('Purchase result:', purchase);

      // 2️⃣ After successful purchase, call createMiningSubscriptionPlanOrder
      let receiptData = '';

      if (Platform.OS === 'ios') {
        receiptData = purchase.transactionReceipt;
      } else if (Platform.OS === 'android') {
        receiptData = String(purchase?.purchaseToken);
      }

      // 2️⃣ Prepare receipt data based on platform
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
        throw new Error('Missing receipt data');
      }

      // 3️⃣ Send receiptData to backend now
      const response = await createMiningSubscriptionPlanOrder(
        email,
        planName + ' Power',
        numericAmount,
        Platform.OS === 'ios' ? 'App Store IAP' : 'Play Store IAP',
        false, // isHoneybee
        receiptData,
        platformData,
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

    } catch (error: any) {
      console.error('Purchase or Order error', error);
      Alert.alert('Payment Failed', error.message || 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.planBadge}>
          {planImages[planName] ? (
            React.createElement(planImages[planName], { width: 60, height: 60 })
          ) : (
            <Star width={60} height={60} style={styles.starIcon} />
          )}
          <View>
            <Text style={styles.planText}>{planName} Power</Text>
          </View>
        </View>

        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{amount}</Text>
        </View>
      </View>

      <Text style={styles.title}>Enter Your Payment Details.</Text>

      <View style={styles.paymentSection}>
        <Text style={styles.label}>Pay With</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={toggleDropdown}>
            <View style={styles.selectedMethod}>
              {selectedMethod ? (
                <>
                  <selectedMethod.Icon
                    width={24}
                    height={24}
                    style={styles.methodIcon}
                  />
                  <Text style={styles.methodText}>{selectedMethod.name}</Text>
                </>
              ) : (
                <Text style={styles.placeholderText}>
                  Select Payment Method
                </Text>
              )}
            </View>

          </TouchableOpacity>
          {/* 
          {isDropdownOpen && (
            <View style={styles.dropdownListContainer}>
              <ScrollView
                style={styles.dropdown}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}>
                {paymentMethods.map(({ id, name, Icon }) => (
                  <TouchableOpacity
                    key={id}
                    style={[
                      styles.methodItem,
                      selectedMethod?.id === id && styles.selectedMethodItem,
                    ]}
                    onPress={() => handleSelectMethod({ id, name, Icon })}>
                    <View style={styles.methodRow}>
                      <Icon width={24} height={24} style={styles.methodIcon} />
                      <Text style={styles.methodText}>{name}</Text>
                      <Text style={styles.dollarSign}>$</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )} */}
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.amountSection}>
            <Text style={styles.label}>Add Amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.amountText}>{amount}</Text>
            </View>
          </View>
          {/* 
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity> */}
          <View style={styles.buttonContainer}>
            <OvalButton
              label={isProcessing ? "Processing..." : "Continue"}
              IconInsideOval={isProcessing ? undefined : ArrowRightIcon}
              onPress={handleContinue}
              disabled={isProcessing}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  planPower: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
  header: {
    marginBottom: 24,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,

    borderRadius: 8,
    marginRight: 12,
    gap: 10,
  },
  starIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    tintColor: colors.primary,
  },
  planText: {
    color: '#d5d5d5',
    fontSize: 24,
    fontWeight: '600',
  },
  priceBadge: {
    width: 156,
    height: 40,
    borderRadius: 50,
    backgroundColor: 'rgba(255,135,40,.2)',
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeContainer: {
    width: 156,
    height: 40,
    borderRadius: 50,
    backgroundColor: 'rgba(255,135,40,.2)',
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'orange',
    fontWeight: 500,
    fontSize: 14,
  },
  priceText: {
    color: 'orange',
    fontWeight: 500,
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
    marginBottom: 32,
  },
  paymentSection: {
    flex: 1,
  },
  label: {
    color: '#d5d5d5',
    fontSize: 16,
    marginBottom: 8,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
  },
  methodIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  methodText: {
    color: '#d5d5d5',
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: '#d5d5d5',
    fontSize: 16,
  },
  dropdownListContainer: {
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 1000,
    elevation: 5,
    height: 250,
    overflow: 'hidden',
  },
  dropdown: {
    flex: 1,
    overflow: 'scroll',
    height: '100%',
  },
  methodItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2F2F2F',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  amountSection: {
    marginTop: 24,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 8,
    padding: 16,
  },
  amountText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  continueText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSection: {
    zIndex: 0,
  },
  selectedMethodItem: {
    backgroundColor: 'rgba(255,135,40,.1)',
  },
  buttonContainer: {
    marginTop: 32,
  },
});

export default SelectPaymentMethod;
