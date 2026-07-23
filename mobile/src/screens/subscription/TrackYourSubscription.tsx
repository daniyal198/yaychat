import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import Stepper from '../../components/Stepper';
import {RouteProp, useRoute, useNavigation} from '@react-navigation/native';
import {SubscriptionStackParamList} from '../../navigation/types';
import {AuthNavigationProp} from '../auth_screens/CreateAccountScreen';
import Button from '../../components/Button';

const TrackSubscription = () => {
  const route =
    useRoute<RouteProp<SubscriptionStackParamList, 'TrackSubscription'>>();
  const navigation = useNavigation<AuthNavigationProp>();
  const {orderId, paymentType, amount, currency} = route.params;

  return (
    <View style={styles.container}>
      <Stepper
        orderId={orderId}
        paymentType={paymentType}
        amount={amount}
        currency={currency}
      />
      <View style={styles.detailsContainer}>
        <Text style={styles.detailText}>Order ID: {orderId}</Text>
        <Text style={styles.detailText}>Payment Type: {paymentType}</Text>
        <Text style={styles.detailText}>
          Amount: {amount} {currency}
        </Text>
      </View>
      <Button title="Go to Home" onPress={() => navigation.navigate('Home')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 100,
  },
  detailsContainer: {
    marginVertical: 20,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default TrackSubscription;
