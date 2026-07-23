import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import Swiper from 'react-native-swiper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Button from '../../components/Button';
import {useNavigation} from '@react-navigation/native';
import GopherOne from '../../../assets/splash/one-gopher.svg';
import GopherNine from '../../../assets/splash/NineGopher.svg';
import LeftArrow from '../../../assets/splash/arrow-left.svg';
import RightArrow from '../../../assets/splash/arrow-right.svg';

const plans = [
  {
    title: 'Snatch Gopher',
    subTitle: 'Free mining Plan',
    image: GopherOne,
    offText: '1 Snatch Gophers Mining Power',
    data: [
      'Speed Boost 1x',
      'Standard Mining',
      'No Hidden Fees',
      'Instant Withdrawals',
      'User-Friendly Mining',
      'Secure & Reliable',
      'Referral Bonuses',
      '24/7 Support',
    ],
  },
  {
    title: 'Nugget Gopher',
    subTitle: 'Subscription Power mining Plan',
    description: 'Nugget Gophers are ready to work for you',
    image: GopherNine,
    plans: [
      {
        name: 'Electric Power',
        price: '$100.00 / Month',
      },
      {
        name: 'Turbo Power',
        price: '$300.00 / Month',
      },
      {
        name: 'Nuclear Power',
        price: '$600.00 / Month',
      },
    ],
  },
  {
    title: 'Nerdy Gopher',
    subTitle: 'Computing Power mining Plan',
    image: GopherNine,
    offText: 'More Nerdy Mining Power',
    data: [
      'Speed Boost 9x',
      'Ultra-Fast Mining',
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
  const navigation = useNavigation();

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

  const renderNuggetGopher = () => {
    const plan = plans[1]; // Nugget Gopher plan
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.slide}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planSubtitle}>{plan.subTitle}</Text>

          <View style={styles.divider} />

          <Text style={styles.description}>{plan.description}</Text>

          <View style={styles.imageContainer}>
            <plan.image height={200} />
          </View>

          <View style={styles.plansContainer}>
            {plan?.plans?.map((item, idx) => (
              <View key={idx} style={styles.planItem}>
                <Text style={styles.planName}>{item.name}</Text>
                <Text style={styles.planPrice}>{item.price}</Text>
              </View>
            ))}
            <View style={styles.fixedButtonContainer}>
              <Button
                title="Subscribe"
                onPress={() => navigation.navigate('SelectPaymentMethod')}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderOtherPlans = plan => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.slide}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePrev} disabled={index === 0}>
              <LeftArrow />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.text}>{plan.title}</Text>
            </View>

            <TouchableOpacity
              onPress={handleNext}
              disabled={index === plans.length - 1}>
              <RightArrow />
            </TouchableOpacity>
          </View>

          <Text style={styles.subTitle}>{plan.subTitle}</Text>

          <View style={styles.imageContainer}>
            <plan.image height={200} />
          </View>

          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{plan.offText}</Text>
          </View>

          <View style={styles.listContainer}>
            {plan.data.map((item: any, idx:any) => (
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
            <View style={styles.fixedButtonContainer}>
              <Button
                title="Subscribe"
                onPress={() => navigation.navigate('SelectPaymentMethod')}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    );
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
          <View key={i}>
            {i === 1 ? renderNuggetGopher() : renderOtherPlans(plan)}
          </View>
        ))}
      </Swiper>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  swiper: {
    height: height,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  slide: {
    padding: 20,
    paddingBottom: 30,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8728',
    textAlign: 'center',
    marginBottom: 5,
  },
  planSubtitle: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 15,
  },
  description: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  plansContainer: {
    marginTop: 20,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  planName: {
    fontSize: 16,
    color: '#FFF',
  },
  planPrice: {
    fontSize: 16,
    color: '#FF8728',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8728',
  },
  subTitle: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  badgeContainer: {
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingHorizontal: 20,
  },
  listText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  fixedButtonContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
});

export default CarouselComponent;
