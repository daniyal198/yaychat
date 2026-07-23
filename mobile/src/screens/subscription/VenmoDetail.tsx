import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import {colors} from '../../theme/colors';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {
  SubscriptionNavigationProp,
  SubscriptionStackParamList,
} from '../../navigation/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import VenmoQR from '../../../assets/img/venmo_qr.svg';
import VenmoLogo from '../../../assets/img/venmo_logo.svg';
import VenmoIcon from '../../../assets/img/venmo_text_logo.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {decodeJWT} from '../../utils/jwt';
import OvalButton from '../../components/OvalButton';
import CancelIcon from '../../../assets/img/cancelIcon.svg';
import CheckIcon from '../../../assets/img/checkIcon.svg';
const VenmoDetail = () => {
  const navigation = useNavigation<SubscriptionNavigationProp>();
  const route =
    useRoute<RouteProp<SubscriptionStackParamList, 'VenmoDetail'>>();
  const {order} = route.params;
  const handleCancel = () => {
    navigation.goBack();
  };

  const handleConfirmPayment = async () => {
    let email;
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      const userObj = decodeJWT(token);
      email = userObj.email;
    } else {
      Alert.alert('Error', 'Please login to view subscription');
      return;
    }
    let fromDetails = email;
    let toDetails = 'lili@Indexx500Graph.ai';
    navigation.navigate('UploadFile', {
      orderId: order.orderId,
      paymentType: 'Venmo',
      amount: order.breakdown.inAmount,
      currency: order.breakdown.inCurrenyName,
      fromDetails,
      toDetails,
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Venmo Logo */}
      <View style={styles.logoContainer}>
        {/* <Image
          source={require('../../../assets/img/venmo-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}
        <VenmoLogo style={styles.logo} />
      </View>

      {/* Warning Message */}
      <View style={styles.warningContainer}>
        <Ionicons name="warning" size={24} color="#d5d5d5" />
        <Text style={styles.warningText}>
          Kindly transfer the exact amount specified above using the provided
          recipient details
        </Text>
      </View>

      {/* Order Amount */}
       <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Order Id: {order?.orderId}</Text>
              <View style={styles.amountRow}>
                <Text style={styles.amount}>
                  {Number(order?.breakdown?.inAmount).toFixed(2)}
                </Text>
                <Text style={styles.currency}>
                  {order?.breakdown?.inCurrenyName}
                </Text>
              </View>
            </View>

      {/* QR Code Section */}
      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>Send Money With Venmo</Text>
        <Text style={styles.qrSubtitle}>Scan the code to pay</Text>

        <VenmoQR style={styles.qrCode} />

        <VenmoIcon style={styles.venmoLogo} />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {/* <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity> */}

        <OvalButton
          label="Cancel"
          IconInsideOval={CancelIcon}
          onPress={handleCancel}
        />

        <OvalButton
          label="Confirm Payment"
          IconInsideOval={CheckIcon}
          onPress={handleConfirmPayment}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 30,
  },
  warningContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  warningText: {
    color: '#d5d5d5',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 30,
    fontWeight: '600',
    color: '#d5d5d5',
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },

  currency: {
    fontSize: 16,
    color: '#d5d5d5',
    opacity: 0.8,
  },
  qrContainer: {
    flex: 1,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#3396CD',
    marginBottom: 4,
  },
  qrSubtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 24,
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  venmoLogo: {
    width: 80,
    height: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default VenmoDetail;
