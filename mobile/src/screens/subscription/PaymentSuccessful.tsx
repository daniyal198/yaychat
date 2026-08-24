import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SubscriptionNavigationProp, SubscriptionStackParamList } from '../../navigation/types';
import SuccessIcon from '../../../assets/img/payment_successful_icon.svg';
const PaymentSuccessful = () => {
  const navigation = useNavigation<SubscriptionNavigationProp>();

  const route = useRoute<RouteProp<SubscriptionStackParamList, 'PaymentSuccessful'>>();

  const { orderId, amount, currency, paymentType } = route.params;

  const handleUpload = () => {
    navigation.navigate('UploadFile', {
      orderId,
      paymentType,
      amount: Number(amount),
      currency,
    });
  };
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <SuccessIcon style={styles.icon} />
        </View>

        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>
          Thank you! Your payment is completed for ${amount} Successfully.
        </Text>

        {paymentType === "Play Store (Subscription)" || paymentType === "App Store (Subscription)" ?
          (<>  </>) :
          (<><Text style={styles.uploadText}>Now take a Screenshot and Upload!</Text>

            <TouchableOpacity style={styles.uploadButton} onPress={handleUpload}>
              <Text style={styles.uploadButtonText}>Upload</Text>
            </TouchableOpacity> </>)
        }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 135, 40, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#d5d5d5',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 280,
  },
  uploadText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentSuccessful;