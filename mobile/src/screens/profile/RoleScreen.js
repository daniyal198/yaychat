import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {Share} from 'react-native';

import * as Progress from 'react-native-progress';
import Ionicons from 'react-native-vector-icons/Ionicons';
import OvalButton from '../../components/OvalButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {decodeJWT} from '../../utils/jwt';
import {getUserDetails} from '../../services/auth.service';

const RoleScreen = () => {
  const [progress, setProgress] = React.useState(0);
  const [userData, setUserData] = useState(null);
  const [email, setEmail] = useState(null);
  const fetchMiningData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const userObj = decodeJWT(token);
        const userEmail = userObj?.email;
        setEmail(userEmail);

        const [userDetails] =
          await Promise.all([getUserDetails(userObj?.email)]);

        if (userDetails.status === 200) {
          setUserData(userDetails.data);
        }
      }
    } catch (err) {
      console.log('Failed to fetch mining details:', err);
    }
  };

  useEffect(() => {
    fetchMiningData();
  }, []);

  const handleShareReferral = async () => {
    try {
      const message = `Hey! Join Bitcoin yay and start mining with me. Use my referral link to sign up: https://bitcoinyay.com/referral=${
        userData?.referralCode || 'Robert90'
      }`;

      await Share.share({
        message,
        title: 'Join Bitcoin yay!',
      });
    } catch (error) {
      console.log('Error sharing referral code:', error);
    }
  };
  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev < 1 ? prev + 0.1 : 1));
    }, 500);

    return () => clearInterval(interval);
  }, []);
  return (
    <ScrollView style={styles.container}>
      <View
        style={{
          alignItems: 'center',
          width: '100%',
          marginBottom: 20,
        }}>
        <Text style={styles.title}>Roles</Text>
      </View>

      <View style={styles.sectionWithBg}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            marginBottom: 8,
          }}>
          <Ionicons name="help-circle-outline" size={22} color={'#d5d5d5'} />
          <Text style={styles.sectionTitle}>Nugget Gopher</Text>
        </View>
        <Text style={styles.sectionSubTitle}>
          Distribute Bitcoin yay Widely
        </Text>
        <Text style={styles.sectionDescription}>
          We’re spreading the Bitcoin Yay experience far and wide—inviting more
          people every day to join the movement. Through community outreach,
          partnerships, and smart sharing tools, we’re making it easier than
          ever for anyone to discover the fun, friendly side of Bitcoin. The Yay
          is just getting started.
        </Text>
        {/* <TouchableOpacity style={styles.faqButton}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
            <Text style={styles.buttonText}>Invite</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={12}
              color={'#fff'}
              style={{marginTop: 2}}
            />
          </View>
        </TouchableOpacity> */}
        <OvalButton
          textInsideOval={'Invite'}
          isPng={true}
          onPress={() => {
            handleShareReferral();
          }}
        />
      </View>
      <View style={styles.sectionWithBg}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              marginBottom: 8,
            }}>
            <Ionicons name="help-circle-outline" size={22} color={'#d5d5d5'} />
            <Text style={styles.sectionTitle}>Pocket Gopher</Text>
          </View>
          <Progress.Circle
            size={75}
            progress={progress}
            showsText
            color="grey"
            thickness={6} // Controls stroke thickness
            textStyle={{
              text: {
                color: 'white', // Makes text white
                fontWeight: 'regular',
              },
            }}
          />
        </View>

        <Text style={styles.sectionSubTitle}>Build the security graph</Text>

        <Text style={styles.sectionDescription}>
          We’re building the Security Graph—an evolving network of trust that
          helps users connect, transact, and explore with confidence. By mapping
          reputations, verifying interactions, and surfacing safety signals,
          Bitcoin Yay is creating a smarter, safer way to engage with Bitcoin.
          Trust isn’t just built—it’s visualized.
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            marginBottom: 8,
          }}>
          <Text style={{color: '#FF8728', fontSize: 12, fontWeight: 500}}>
            Locked
          </Text>
          <Image source={require('../../../assets/img/lock.png')} />
        </View>
      </View>
      <View style={styles.sectionWithBg}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            marginBottom: 8,
          }}>
          <Text style={styles.sectionTitle}>Scratch Gophers</Text>
        </View>
        <Text style={styles.sectionSubTitle}>Build the security graph</Text>

        <Text style={styles.sectionDescription}>
          In a world of bots, scams, and shady actors, proving you're human is
          more powerful than ever. Bitcoin Yay keeps it simple and
          fun—lightweight verifications that help real people connect, trade,
          and explore without the noise. No friction, just signal. Because
          Bitcoin is for humans, not scripts.
        </Text>
        {/* <TouchableOpacity style={styles.faqButton}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.buttonText}>Info</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={12}
              color={'#fff'}
              style={{marginTop: 2}}
            />
          </View>
        </TouchableOpacity> */}
        {/* <OvalButton textInsideOval={'Info'} isPng={true} onPress={() => {}} /> */}
      </View>

      <View style={styles.sectionWithBg}>
        <View
          style={{
            marginBottom: 8,
          }}>
          <Text style={styles.sectionTitle}>Node</Text>
        </View>
        <Text style={styles.sectionSubTitle}>
          Run the decentralized blockchain
        </Text>
        <Text style={styles.sectionDescription}>
          Bitcoin Yay empowers everyone to be part of the network. By running
          the decentralized blockchain, users help validate transactions, secure
          the system, and keep Bitcoin truly peer-to-peer. No central
          authority—just a global community keeping the chain alive and
          trustless.
        </Text>
        {/* <TouchableOpacity style={styles.faqButton}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.buttonText}>Read</Text>
            <Ionicons
              name="chevron-forward-outline"
              size={12}
              color={'#fff'}
              style={{marginTop: 2}}
            />
          </View>
        </TouchableOpacity> */}
      </View>

      <View style={styles.sectionWithBg}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            marginBottom: 8,
          }}>
          <Ionicons name="help-circle-outline" size={22} color={'#d5d5d5'} />
          <Text style={styles.sectionTitle}>Developer Ambassador</Text>
        </View>
        <Text style={styles.sectionSubTitle}>
          Grow the Bitcoin yay Ecosystem
        </Text>

        <Text style={styles.sectionDescription}>
          The Bitcoin Yay ecosystem is blooming—and you’re a part of it. From
          developers building cool tools to creators spreading the message,
          every contribution helps shape a more open, playful, and
          people-powered Bitcoin future. Let’s grow together and make Bitcoin
          Yay the heart of the new wave.
        </Text>
        {/* <TouchableOpacity style={styles.faqButton}>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.buttonText}>Dashboard</Text>
          </View>
        </TouchableOpacity> */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  button: {
    backgroundColor: '#007bff',
    marginBottom: 16,
  },
  faqButton: {
    backgroundColor: '#FF8728',
    padding: 10,
    // width: 65,
    height: 40,
    marginBottom: 10,
    //width: '100%', // Ensures button takes full width of parent container
    borderRadius: 10,
    alignItems: 'center',

    alignSelf: 'flex-start',

    // marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 500,
    fontSize: 12,
  },
});

export default RoleScreen;
