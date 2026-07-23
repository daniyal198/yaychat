import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import Collapsible from 'react-native-collapsible';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {getUserMiningBalance} from '../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {decodeJWT} from '../utils/jwt';
import OvalButton from '../components/OvalButton';
import WalletIcon from '../../assets/img/assetWalletIcon.svg';
const MainestDropDown = () => {
  const navigation = useNavigation();
  const [activeSections, setActiveSections] = React.useState([]);
  const [balances, setBalances] = useState({
    transferableBalance: 0,
    migratedBalance: 0,
    unverifiedBalance: 0,
  });

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userObj = decodeJWT(token);
          const res = await getUserMiningBalance(userObj?.email);
          const data = res?.data;
          setBalances({
            transferableBalance: data?.transferableBalance || 0,
            migratedBalance: data?.migratedBalance || 0,
            unverifiedBalance: data?.unverifiedBalance || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load mining balances:', err);
      }
    };

    fetchBalance();
  }, []);

  const toggleSection = index => {
    if (activeSections.includes(index)) {
      setActiveSections(activeSections.filter(i => i !== index));
    } else {
      setActiveSections([...activeSections, index]);
    }
  };
  const faqs = [
    {
      question: 'Unverified Balance',
      answer:
        'This is the estimated bonus Bitcoin yay you have earned through your Referral Team and Security Circle.These bonus rewards will be accurately calculated and made transferable to the Mainnet once your Referral Team and Security Circle members complete their identity verification (KYC).',
      faqButton: 'Convert',
      IconInsideOval: '',
    },
    {
      question: 'Transferable Balance',
      answer: 'need to change from document',
      faqButton: 'Transfer',
      IconInsideOval: '',
    },
    {
      question: 'Migrated to Mainnet',
      answer:
        'After completing all the steps in the Mainnet Checklist and migrating your Transferable Balance to your wallet (Mainnet Migration), this will display the total amount of Bitcoin yay migrated to your Mainnet wallet.',
      faqButton: 'View Wallet',
      IconInsideOval: WalletIcon,
    },
  ];
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            alignSelf: 'flex-start',
            width: '100%',
          }}>
          <Text style={styles.title}>Balance Dashboard</Text>
        </View>

        <Text style={styles.description}>
          This is a breakdown of your total mined, Also shown at the top of this
          mining app.{' '}
        </Text>
        <View style={styles.rateButtons}>
          <RateButton
            title={balances?.unverifiedBalance.toFixed(3)}
            value="Unverified"
          />
          <RateButton
            title={balances?.transferableBalance.toFixed(3)}
            value="Transferable"
          />
          <RateButton
            title={balances?.migratedBalance.toFixed(3)}
            value="Migrated"
          />
        </View>

        {faqs.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              onPress={() => toggleSection(index)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 5,
              }}>
              <View style={{flexDirection: 'row'}}>
                <Text style={styles.question}>{faq.question}</Text>
                <View style={{width: 10, marginTop: 5, marginLeft: 10}}>
                  <Ionicons
                    name={
                      !activeSections.includes(index)
                        ? 'chevron-up-outline'
                        : 'chevron-down-outline'
                    }
                    size={12}
                    color={'#fff'}
                  />
                </View>
              </View>
            </TouchableOpacity>

            <Collapsible collapsed={!activeSections.includes(index)}>
              <Text style={styles.answer}>{faq.answer}</Text>
              {/* <View style={{marginVertical: '20'}}>
                {faq.IconInsideOval ? (
                  <OvalButton
                    label={faq.faqButton}
                    IconInsideOval={faq.IconInsideOval}
                    onPress={() => navigation.push('UnverifiedBalance')}
                  />
                ) : (
                  <OvalButton
                    textInsideOval={faq.faqButton}
                    onPress={() => navigation.push('UnverifiedBalance')}
                  />
                )}
              </View> */}
            </Collapsible>
          </View>
        ))}
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('MainnetChecklist')}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignSelf: 'flex-start',
              width: '100%',
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <Image
                style={styles.logo}
                source={require('../../assets/img/mainest.png')}
              />
              <Text style={styles.buttonText}>Mainnet Checklist </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={'#fff'} />
          </View>
        </TouchableOpacity>
        {/* <TouchableOpacity style={styles.button}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignSelf: 'flex-start',
              width: '100%',
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <Image
                style={styles.logo}
                source={require('../../assets/img/balance.png')}
              />
              <Text style={styles.buttonText}>
                Increase Transferable Balance{' '}
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={'#fff'} />
          </View>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            navigation.navigate('WhitePaper');
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignSelf: 'flex-start',
              width: '100%',
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
              <Image
                style={styles.logo}
                height={50}
                source={require('../../assets/img/checklist.png')}
              />
              <Text style={styles.buttonText}>New White Paper Chapter</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={20} color={'#fff'} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const RateButton = ({title, value, active}) => (
  <TouchableOpacity
    style={[styles.rateButton, active && styles.activeRateButton]}>
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Ionicons name="help-circle-outline" size={20} color={'#d5d5d5'} />
      <Text style={[styles.rateButtonText && styles.activeRateButtonText]}>
        {title}
      </Text>
      <Image
        style={{
          height: 12, // Reduced icon size
          width: 12,
          marginLeft: 5,
          resizeMode: 'contain',
          color: 'white',
        }}
        source={require('../../assets/img/yayB1.png')}
      />
    </View>

    <Text style={[styles.rateValue, active && styles.activeRateButtonText]}>
      {value}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 85,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',

    color: '#d5d5d5',
  },
  description: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 16,
    color: '#d5d5d5',
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 400,
    marginBottom: 16,
    color: '#FF8728',
  },
  sectionWithBg: {
    marginBottom: 24,
    color: '#d5d5d5',
    backgroundColor: '#252525',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',

    color: '#d5d5d5',
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 20,
    marginBottom: 8,
    color: '#d5d5d5',
  },
  sectionDescription: {
    fontSize: 12,
    marginBottom: 16,

    color: '#d5d5d5',
    lineHeight: 20,
  },
  orangeText: {
    color: '#FF8728',
  },
  buttonContainer: {
    width: '100%', // Ensures the container is full width
  },
  button: {
    backgroundColor: '#787878',
    padding: 10,
    width: '100%', // Ensures button takes full width of parent container
    borderRadius: 10,
    alignItems: 'center',
    opacity: 0.5,
    alignSelf: 'flex-start',

    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 500,
    marginLeft: 5,
    fontSize: 12,
  },
  faqItem: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2F2F2F',
    padding: 15,
    borderRadius: 15,
    color: '#D5D5D5',
  },
  question: {
    fontSize: 14,
    fontWeight: '500',
    // marginBottom: 8,
    color: '#D5D5D5',
  },
  answer: {
    fontSize: 12,
    marginTop: 8,
    color: '#D5D5D5',
    lineHeight: 20,
  },
  faqButton: {
    backgroundColor: '#FF8728',
    padding: 10,
    width: 80,
    height: 40,
    //width: '100%', // Ensures button takes full width of parent container
    borderRadius: 10,
    alignItems: 'center',

    alignSelf: 'center',

    // marginVertical: 10,
  },
  rateButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#252525',
    borderRadius: 20,
    padding: 15,
  },
  rateButton: {
    flex: 1,
    //backgroundColor: '#222',

    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeRateButton: {
    backgroundColor: '#FF9800',
  },
  rateButtonText: {
    fontSize: 16,
    color: '#BBB',
    fontWeight: 'medium',
  },
  activeRateButtonText: {
    fontSize: 16,
    color: '#BBB',
    fontWeight: 'medium',
  },
  rateValue: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'light',
    color: '#FF8728',
  },
  logo: {
    height: 50,
    width: 50,
    resizeMode: 'contain',
  },
});

export default MainestDropDown;
