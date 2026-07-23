 
import React from 'react';
import {View, Text, StyleSheet, ScrollView, Image} from 'react-native';

import user_agree_img_1 from '../../../assets/img/user_agreement_image_1.png'
import user_agree_img_2 from '../../../assets/img/user_agreement_image_2.png'
import user_agree_img_3 from '../../../assets/img/user_agreement_image_3.png'
import user_agree_img_4 from '../../../assets/img/user_agreement_image_4.png'
import user_agree_img_5 from '../../../assets/img/user_agreement_image_5.png'
import user_agree_img_6 from '../../../assets/img/user_agreement_image_11.png'   
import user_agree_img_7 from '../../../assets/img/user_agreement_image_7.png'
import user_agree_img_8 from '../../../assets/img/user_agreement_image_8.png'
import user_agree_img_9 from '../../../assets/img/user_agreement_image_9.png'
import user_agree_img_10 from '../../../assets/img/user_agreement_image_10.png'




const UserAgreement = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Agreement to Terms</Text>
      <Text style={styles.text}>
      By accessing or using the Bitcoin Yay website, mobile application, services, or related platforms ("Services"), you agree to abide by the terms and conditions set forth in this User Agreement. If you do not agree to these terms, you are not permitted to use Bitcoin Yay's Services.
      </Text>
      <Image source={user_agree_img_1} style={styles.image} />
      <Text style={[styles.title2, {}]}>Acknowledgment of Risks</Text>
      <Text style={styles.text}>
        <Text style={styles.bullet}>• </Text> Bitcoin Yay (BTCY) is a cryptocurrency utility token designed solely for use within the Bitcoin Yay ecosystem. It does not represent an investment or security, nor does it promise financial returns.{'\n'}{' '}
        <Text style={styles.bullet}>• </Text>Cryptocurrency prices, including BTCY, are highly volatile and subject to sudden and significant changes. You acknowledge these risks and agree to accept any losses or financial impacts associated with using Bitcoin Yay.{'\n'}{' '}
        
      </Text>
      <Image source={user_agree_img_2} style={styles.image} />
      <Text style={[styles.title2, {}]}>
      User Responsibilities
      </Text>
      <Text style={styles.text}>
        <Text style={styles.bullet}>• </Text> Provide accurate and truthful personal information when prompted.{'\n'}{' '}
        <Text style={styles.bullet}>• </Text>Comply with all applicable local, national, and international laws and regulations.{'\n'}{' '}
        <Text style={styles.bullet}>• </Text>Not engage in any fraudulent, deceptive, illegal, or malicious activity, including money laundering, terrorist financing, hacking, or misuse of the platform.{'\n'}{' '}
      
      </Text>
      <Image source={user_agree_img_3} style={styles.image} />
      <Text style={[styles.title2, {}]}>Data Privacy and Protection</Text>
      <Text style={styles.text}>
      Your privacy is crucial to us. Bitcoin Yay collects, processes, and stores personal data in accordance with our Privacy Policy. By agreeing to this User Agreement, you explicitly consent to our Privacy Policy, available separately.{'\n'} <Text style={styles.bullet}>• </Text>YYou will not
        engage in fraudulent, deceptive, or unlawful activities.{'\n'}{' '}
       
      </Text>
      <Image source={user_agree_img_4} style={styles.image} />
      <Text style={[styles.title2, {}]}>Account Security</Text>
      <Text style={styles.text}>
      You are responsible for maintaining the confidentiality of your account credentials. Bitcoin Yay is not liable for any loss or damage arising from unauthorized access resulting from your failure to secure your account credentials.
      </Text>
      <Image source={user_agree_img_5} style={styles.image} />
      <Text style={[styles.title2, {}]}>Intellectual Property</Text>
      <Text style={styles.text}>
      All intellectual property rights, including trademarks, logos, software, and other proprietary content related to Bitcoin Yay, belong exclusively to Bitcoin Yay or its licensors. You agree not to copy, reproduce, distribute, or otherwise infringe upon these rights.
      </Text>
      <Image source={user_agree_img_6} style={styles.image} />
      <Text style={[styles.title2, {}]}>Compliance and Verification</Text>
      <Text style={styles.text}>
      Bitcoin Yay reserves the right to conduct Know Your Customer (KYC) and Anti-Money Laundering (AML) verifications as necessary. You agree to comply promptly with all such verification requests. Failure to comply may result in the suspension or termination of your account.
      </Text>
      <Image source={user_agree_img_7} style={styles.image} />
      <Text style={[styles.title2, {}]}>Termination of Service</Text>
      <Text style={styles.text}>
      Bitcoin Yay reserves the right, at its sole discretion, to suspend or terminate your access to the Services without prior notice if you violate this User Agreement, engage in unlawful activities, or otherwise misuse the platform.
      </Text>
      <Image source={user_agree_img_8} style={styles.image} />
      <Text style={[styles.title2, {}]}>Limitation of Liability</Text>
      <Text style={styles.text}>
      In no event shall Bitcoin Yay or its affiliates, officers, directors, employees, or agents be liable for any direct, indirect, incidental, consequential, special, or exemplary damages arising from your use or inability to use the Services.{'\n'}
      </Text>
      <Image source={user_agree_img_9} style={styles.image} />
      <Text style={[styles.title2, {}]}>
      Changes to This Agreement
      </Text>
      <Text style={styles.text}>
      Bitcoin Yay reserves the right to modify or update this User Agreement at any time. Continued use of the Services after changes indicates your acceptance of the revised terms. Users are encouraged to review this agreement periodically. </Text>
      <Image source={user_agree_img_10} style={styles.image} />
      <Text style={[styles.title2, {}]}>Governing Law and Jurisdiction</Text>
      <View style={styles.bulletItem}>
        <Text style={styles.text}>
        This User Agreement shall be governed by the laws of the State of California, USA. Any disputes arising under this agreement will be subject to the jurisdiction of courts located in San Francisco, California.
          {'\n'}
        
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 20,
  },
  logo: {
    //width: 45,
    //height: 45,
    marginRight: 5,
  },
  title: {
    fontSize: 14,
    color: '#D5D5D5',
    marginBottom: 3,
    maxWidth: 350,
    fontWeight: 'medium',
  },
  title2: {
    fontSize: 16,
    color: '#D5D5D5',
    marginBottom: 3,
    maxWidth: 350,
    fontWeight: 'bold',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    color: '#d5d5d5',
  },
  bullet: {
    fontSize: 18, // Adjust the size if needed
    color: '#d5d5d5',
    marginRight: 8,
    marginTop: 4, // Align bullet vertically with text
  },
  text: {
    fontSize: 14,
    color: '#D5D5D5',
    marginBottom: 10,
    maxWidth: 350,
    fontWeight: 'regular',
    alignSelf: 'justify',
  },
  image: {
    width: '60%',
    height: 200,
    marginVertical: 50,
    alignSelf: 'center',
    resizeMode: 'contain',
  },
});

export default UserAgreement;
