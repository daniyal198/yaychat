import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Button from '../components/Button';
import Ionicons from 'react-native-vector-icons/Ionicons';

const UnverifiedBalanceScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          alignSelf: 'flex-start',
          width: '100%',

          marginBottom: 20,
        }}>
        <Text style={styles.title}>Unverified Balance</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            alignSelf: 'flex-start',
          }}>
          <Text style={{color: '#d5d5d5', fontSize: 36}}>
            0.<Text style={{fontSize: 20}}>36</Text>
          </Text>
          <Image source={require('../../assets/img/yay_B_white.png')} />
        </View>
      </View>

      <Text style={styles.description}>
        The more people in your{' '}
        <Text style={styles.orangeText}>Referral Team</Text> and{' '}
        <Text style={styles.orangeText}>Security Circle</Text> who pass KYC and
        complete the <Text style={styles.orangeText}>Mainnet Migration</Text>,
        the more of your{' '}
        <Text style={styles.orangeText}>Unverified Balance </Text>
        becomes transferable.
      </Text>
      <Text style={styles.subTitle}>Why?</Text>
      <Text style={styles.description}>
        This is because your{' '}
        <Text style={styles.orangeText}>bonus Bitcoin yay</Text> from the
        Referral Team and Security Circle is tied to the successful verification
        of their identities (KYC). As each member completes their verification
        and migrates to the Maimet, a portion of your unverified balance becomes
        eligible to transfer to your{' '}
        <Text style={styles.orangeText}>Transferable Balance.</Text>
      </Text>

      <View style={styles.sectionWithBg}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            marginBottom: 8,
          }}>
          <Ionicons name="help-circle-outline" size={22} color={'#d5d5d5'} />
          <Text style={styles.sectionTitle}>Member</Text>
        </View>

        <Text style={styles.sectionSubTitle}>
          Distribute Bitcoin yay Widely
        </Text>
        <Text style={styles.sectionDescription}>
          Below are the members of your
          <Text style={styles.orangeText}> Referral Team </Text>
          and <Text style={styles.orangeText}>Security Circle</Text> who have
          either not yet verified their identities (KYC) or completed the
          Initial Maimet Migration process.
        </Text>

        <Text style={styles.sectionDescription}>
          Tap the <Text style={styles.orangeText}>Ping Members</Text> button
          above to send a notification reminding eligible members to complete
          their KYC application, or tap{' '}
          <Text style={styles.orangeText}>Message on Gopher</Text> to send a
          manual message directly.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>No Pending Gopher</Text>
        <View style={{marginBottom: 8}}></View>
        <Text style={styles.sectionDescription}>
          Currently, there are no eligible{' '}
          <Text style={styles.orangeText}>Gopher</Text> from your{' '}
          <Text style={styles.orangeText}>Security Circle</Text> or Referral
          Team who are pending KYC or their initial{' '}
          <Text style={styles.orangeText}>Mainnet Migration.</Text>
          Some members may be temporarily paused and will appear here once their
          timer resumes.
        </Text>
        <Button title="Ping Members" />
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
});

export default UnverifiedBalanceScreen;
