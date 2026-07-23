import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Button from '../../components/Button';
import {useNavigation} from '@react-navigation/native';
import OvalButton from '../../components/OvalButton';
import ChoosePlanIcon from '../../../assets/img/choosePlanIcon.svg';
const Subscription = () => {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Unlock Exclusive Bitcoin Insights with Bitcoin yay!
      </Text>
      <Text style={styles.subHeading}>
        Subscribe now and stay ahead in the crypto world!
      </Text>
      <View style={styles.buttonContainer}>
        <OvalButton
          label="Choose Plan Now"
          IconInsideOval={ChoosePlanIcon}
          size="big"
          onPress={() => navigation.navigate('SubscriptionDetail')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#D5D5D5',
    textAlign: 'center',
    maxWidth: 338,
    marginHorizontal: 'auto',
  },
  subHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#D5D5D5',
    textAlign: 'center',
    maxWidth: 284,
    marginHorizontal: 'auto',
  },
  buttonContainer: {
    width: '100%',
  },
});

export default Subscription;
