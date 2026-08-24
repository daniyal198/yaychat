import React, { useState } from 'react';
import {View, Text, StyleSheet, ScrollView, TextInput, Alert} from 'react-native';
import { colors } from '../../theme/colors';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  SubscriptionNavigationProp,
  SubscriptionStackParamList,
} from '../../navigation/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJWT } from '../../utils/jwt';
import OvalButton from '../../components/OvalButton';
import ArrowRightIcon from '../../../assets/img/arrowRight.svg';
const WireDetail = () => {
  const navigation = useNavigation<SubscriptionNavigationProp>();
  const route = useRoute<RouteProp<SubscriptionStackParamList, 'WireDetail'>>();
  const { order } = route.params;

  // State for form fields
  const [fullName, setFullName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const toDetails = {
    recipientName: 'Indexx.ai',
    recipientAddress: '41775 Elm St, ste. 202 Murrieta CA 92562 USA',
    bankName: 'Wells Fargo Bank, NA',
    bankAccountNumber: '1793811546',
    bankAddress: '420 Montgomery Street, San Francisco, CA 94104',
    wireRoutingNumber: '121000248',
    swiftCode: 'WFBIUS6S',
  };

  const handleContinue = async () => {
    let email;
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      const userObj = decodeJWT(token);
      email = userObj.email;
    } else {
      Alert.alert('Error', 'Please login to view subscription');
      return;
    }
    const fromDetails = {
      fullName,
      bankName,
      bankAccountNumber,
      address,
      phoneNumber,
    };

    navigation.navigate('UploadFile', {
      orderId: order.orderId,
      paymentType: 'Wire Transfer',
      amount: order.breakdown.inAmount,
      currency: order.breakdown.inCurrenyName,
      fromDetails,
      toDetails,
      email: order.email || email, // if not present, fetch from token
    });
  };

  return (
    <ScrollView style={styles.container}>
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
      {/* Recipient Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recipient Information</Text>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>For Domestic wire transfer</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Wire Routing Transit Number(ABA/RTN)
            </Text>
            <Text style={styles.value}>121000248</Text>
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={styles.subsectionTitle}>
            For International wire transfer
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>SWIFT / BIC code</Text>
            <Text style={styles.value}>WFBIUS6S</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Recipient Name</Text>
          <Text style={styles.value}>Indexx.ai</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Recipient Address</Text>
          <Text style={styles.value}>
            41775 Elm St, ste. 202 Murrieta CA 92562 USA
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Bank Name</Text>
          <Text style={styles.value}>Wells Fargo Bank, NA</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Bank Account Number</Text>
          <Text style={styles.value}>1793811546</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Bank Address</Text>
          <Text style={styles.value}>
            {' '}
            420 Montgomery Street, San Francisco, CA 94104
          </Text>
        </View>
      </View>

      {/* Customer Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Customer Information ( For Verification)
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#666"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bank Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Add bank name"
            placeholderTextColor="#666"
            value={bankName}
            onChangeText={setBankName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bank Account Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Add bank account number"
            placeholderTextColor="#666"
            value={bankAccountNumber}
            onChangeText={setBankAccountNumber}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Add address"
            placeholderTextColor="#666"
            value={address}
            onChangeText={setAddress}
            multiline
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Add phone number"
            placeholderTextColor="#666"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity> */}

      <View style={styles.buttonContainer}>
        <OvalButton
          label="Continue"
          IconInsideOval={ArrowRightIcon}
          onPress={handleContinue}
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
  warningContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  amount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
  },
  currency: {
    fontSize: 16,
    color: '#d5d5d5',
    opacity: 0.8,
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
  warningText: {
    color: '#d5d5d5',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  subsection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#d5d5d5',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    color: '#d5d5d5',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    color: '#d5d5d5',
    fontSize: 16,
    marginBottom: 4,
  },
  value: {
    color: '#d5d5d5',
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#d5d5d5',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2F2F2F',
    borderRadius: 8,
    padding: 16,
    color: '#d5d5d5',
    fontSize: 16,
    backgroundColor: 'transparent',
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 32,
    marginTop: 2,
  },
});

export default WireDetail;
