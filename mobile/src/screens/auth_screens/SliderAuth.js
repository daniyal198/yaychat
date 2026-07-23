import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import OvalButton from '../../components/OvalButton';
import BitcoinLogo from '../../../assets/img/yay_03.svg';
import SliderAuth1 from '../../../assets/img/slider_auth_1.png';
import SliderAuth2 from '../../../assets/img/slider_auth_2.png';
import SliderAuth3 from '../../../assets/img/slider_auth_3.png';
import SliderAuth4 from '../../../assets/img/slider_auth_4.png';
import SliderAuth5 from '../../../assets/img/slider_auth_5.png';
import SliderAuth6 from '../../../assets/img/slide_auth_6.png';
const { width, height } = Dimensions.get('window');

const slides = [
  {
    Logo: BitcoinLogo,
    Image: SliderAuth1,
    title: 'The Micro token of Bitcoin',
    subtitle: '',
  },
  {
    Logo: '',
    Image: SliderAuth2,
    title: 'Mobile Mining is Here',
    subtitle: '',
  },
  {
    Logo: '',
    Image: SliderAuth3,
    title: 'Pick Up Your Gopher to mine BTCY',
    subtitle: '',
  },
  {
    Logo: '',
    Image: SliderAuth4,
    title: 'Built on Bitcoin.',
    subtitle: 'Powered by You.',
  },
  {
    Logo: '',
    Image: SliderAuth5,
    title: 'Use BTCY,for Peer-to-peer',
    subtitle: 'Payment Transaction',
  },
  {
    Logo: '',
    Image: SliderAuth6,
    title: '21 Trillion',
    subtitle: 'BTCY for everyone to mine',
  },
];

const SliderAuth = ({ navigation }) => {
  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [fadeAnim]);

  const handleLogin = () => {
    if (navigation) navigation.navigate('Login');
  };
  const handleRegister = () => {
    if (navigation) navigation.navigate('Register');
  };

  const slide = slides[current];

  return (
    <View style={styles.container}>
    
      <Animated.View style={[styles.slide, { opacity: fadeAnim }]}>  
        {
            slide.Logo && (
                <slide.Logo style={styles.image} resizeMode="contain" />
            )
        }      
        <Text style={styles.title}>{slide.title}</Text>
        {!!slide.subtitle && <Text style={styles.subtitle}>{slide.subtitle}</Text>}
        <View style={{ width: '100%', marginTop:0}}>
          {<Image source={slide.Image} />}
        </View>
      
      </Animated.View>
      <View  />
        <OvalButton textInsideOval="Login" onPress={handleLogin} />
        <Text style={styles.footerText}>
          Don't have an account?{' '}
          <Text style={styles.register} onPress={handleRegister}>Register</Text>
        </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  headerText: {
    color: '#D5D5D5',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 10,
  },
  slide: {
    flex: 1,
   paddingTop: 100,
   alignItems: 'center',
    width: '100%',
 
  },
  image: {
    width: width * 0.7,
    height: height * 0.35,
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 38,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,

  },
  subtitle: {
    color: '#D5D5D5',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,

  },

  footerText: {
    color: '#D5D5D5',
    fontSize: 15,
    marginTop: 30,
    marginBottom: 20,
    textAlign: 'center',
  },
  register: {
    color: '#FF9900',
    textDecorationLine: 'underline',
  },
});

export default SliderAuth;