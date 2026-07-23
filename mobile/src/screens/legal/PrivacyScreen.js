//import {useNavigation} from '@react-navigation/native';
//import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {View, Text, StyleSheet, ScrollView, Linking} from 'react-native';
import {colors} from '../../theme/colors';

//import {RootStackParamsList} from '../../RootNavigator';

// type StartScreenNavigationProp = StackNavigationProp<
//   RootStackParamsList,
//   'Home'
// >;

const PrivacyScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.text}>
          Bitcoin Yay, along with its parent company and affiliates ("Bitcoin Yay," "we," "our," or "us"), values the privacy of our users and is committed to protecting their personal information. This Privacy Policy ("Policy") outlines how we collect, use, share, and store data from users of the Bitcoin Yay website, mobile applications, and services (collectively, the "Services").
        </Text>
        <Text style={styles.text}>
          By accessing or using our Services, you agree to the terms of this Policy and our [Terms of Use], and you consent to our collection, use, disclosure, and retention of your information as described herein. If you do not agree with any part of this Privacy Policy or our Terms of Use, please refrain from using our Services.
        </Text>
        <Text style={styles.text}>
          If you are visiting our website from the European Union (EU), please refer to the Notice to EU Data Subjects for information on our data processing and transfer policies. If you are a California resident, please review our California Privacy Notice at [link].
        </Text>

        {/* 1. Information We Collect */}
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.text}>We collect personal information in three ways:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Directly from You</Text> – When you voluntarily provide information through account registration, communication, or transactions.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Automated Technologies</Text> – Information collected through cookies, web beacons, and tracking technologies when you use our Services.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Third-Party Sources</Text> – Data obtained from service providers, analytics platforms, and social media integrations.</Text>
        </View>
        <Text style={styles.text}>We also aggregate and anonymize data for analytical and business purposes.</Text>

        {/* A. Information You Provide to Us */}
        <Text style={styles.subSectionTitle}>A. Information You Provide to Us</Text>
        <Text style={styles.text}>We collect the following types of information:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Contact & Identity Information</Text> – Name, phone number, email address, username, and linked social media accounts.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• User-Generated Content</Text> – Messages, comments, reactions, and media shared in forums or community spaces.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Transaction Data</Text> – Records of cryptocurrency transactions sent, received, or processed through Bitcoin Yay.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Feedback & Correspondence</Text> – Survey responses, customer support interactions, and other inquiries.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Marketing Preferences</Text> – Choices related to promotional communications and engagement with our campaigns.</Text>
        </View>

        {/* B. KYC & Compliance Data */}
        <Text style={styles.subSectionTitle}>B. Know Your Customer (KYC) & Compliance Data</Text>
        <Text style={styles.text}>To comply with Anti-Money Laundering (AML), Know-Your-Customer (KYC), and Counter-Terrorist Financing (CTF) regulations, Bitcoin Yay collects identity verification data, including:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Government-issued IDs</Text> (passport, driver's license, national identity card)</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Proof of Address</Text> (utility bills, bank statements)</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Selfie images or videos</Text> for identity confirmation</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Source of funds and wealth declarations</Text></Text>
        </View>
        <Text style={styles.text}>KYC data is processed securely using human and AI-based verification technologies to ensure compliance and prevent fraudulent activities. By using our KYC services, users consent to the use of AI verification tools for identity authentication.</Text>

        {/* C. Information Collected from Third Parties */}
        <Text style={styles.subSectionTitle}>C. Information Collected from Third Parties</Text>
        <Text style={styles.text}>We may receive additional data from:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Other users</Text> (e.g., if a user shares their contacts and you are listed as one of them)</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Social media and login providers</Text> (Facebook, Google, Apple Sign-In)</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Public databases and blockchain transactions</Text></Text>
        </View>
        <Text style={styles.text}>Some social media features, such as "Like" and "Share" buttons, may collect data based on your interactions. Your use of these features is governed by the privacy policies of the respective platforms.</Text>

        {/* D. Automatically Collected Data */}
        <Text style={styles.subSectionTitle}>D. Automatically Collected Data</Text>
        <Text style={styles.text}>When you use our Services, we collect:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Device Information</Text> – Model, OS version, browser type, and unique device identifiers.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Usage & Activity Data</Text> – Mining frequency, transactions, account behavior, and engagement with Bitcoin Yay tools.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Location Information</Text> – GPS data, IP addresses, and network details (with user consent).</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Log Information</Text> – Browser activity, access times, page visits, and referring URLs.</Text>
        </View>
        <Text style={styles.text}>We use cookies and analytics tools (e.g., Google Analytics) to improve user experience and optimize our Services. Learn more in our [Cookies Policy].</Text>

        {/* E. Data Security & Protection */}
        <Text style={styles.sectionTitle}>E. Data Security & Protection</Text>
        <Text style={styles.text}>Bitcoin Yay implements robust security measures, including:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• End-to-end encryption</Text> for sensitive data</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• AI-powered fraud detection</Text> to prevent unauthorized access</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Strict KYC compliance</Text> to ensure a secure crypto ecosystem</Text>
        </View>
        <Text style={styles.text}>We never request or store private wallet keys or passphrases. Users should never share this information with anyone.</Text>

        {/* 2. How We Use Your Information */}
        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.text}>We use collected data for the following purposes:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• To provide and enhance our Services</Text> (e.g., crypto transactions, account management)</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• To ensure compliance</Text> with legal, regulatory, and security standards</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• To personalize user experience</Text> and deliver relevant content</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• To facilitate KYC verification</Text> and prevent fraud</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• To improve customer support and engagement</Text></Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• To communicate updates, promotions, and service notifications</Text></Text>
        </View>

        {/* 3. Data Sharing & Third-Party Disclosures */}
        <Text style={styles.sectionTitle}>3. Data Sharing & Third-Party Disclosures</Text>
        <Text style={styles.text}>Bitcoin Yay does not sell user data. However, we may share information with:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Regulatory authorities</Text> (for legal compliance)</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Service providers</Text> (for payment processing, KYC, and analytics)</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Blockchain networks</Text> (to validate transactions)</Text>
        </View>

        {/* 4. Your Privacy Rights */}
        <Text style={styles.sectionTitle}>4. Your Privacy Rights</Text>
        <Text style={styles.text}>Depending on your jurisdiction, you may have rights to:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Access and correct your data</Text>
          <Text style={styles.bulletItem}>• Request data deletion</Text>
          <Text style={styles.bulletItem}>• Opt out of marketing communications</Text>
          <Text style={styles.bulletItem}>• Restrict data processing in certain cases</Text>
        </View>
        <Text style={styles.text}>For privacy-related inquiries, contact us at <Text style={styles.link} onPress={() => Linking.openURL('mailto:privacy@bitcoinyay.com')}>privacy@bitcoinyay.com</Text>.</Text>

        {/* 5. Policy Updates */}
        <Text style={styles.sectionTitle}>5. Policy Updates</Text>
        <Text style={styles.text}>Bitcoin Yay may update this Privacy Policy periodically. Continued use of our Services after updates constitutes acceptance of the revised terms. For more details, visit [Bitcoin Yay Privacy Policy] or reach out to our support team.</Text>

        {/* Add new detail here */}
        <Text style={styles.sectionTitle}>How We Use Information</Text>
        <Text style={styles.subSectionTitle}>To Provide Our Services</Text>
        <Text style={styles.text}>We utilize your information in the following ways:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Develop, operate, improve, deliver, maintain, and protect our services.</Text>
          <Text style={styles.bulletItem}>• Communicate with you by sending confirmations, technical notices, updates, security alerts, support messages, and administrative notifications.</Text>
          <Text style={styles.bulletItem}>• Monitor and analyze platform usage to enhance performance and user experience.</Text>
          <Text style={styles.bulletItem}>• Personalize your experience by suggesting relevant connections, message templates, or customized content, including advertisements.</Text>
          <Text style={styles.bulletItem}>• Enhance the security and integrity of our services.</Text>
          <Text style={styles.bulletItem}>• Verify user identities and safeguard against fraudulent, unauthorized, or illegal activities.</Text>
          <Text style={styles.bulletItem}>• Utilize cookies and similar technologies to improve service functionality and user interaction.</Text>
        </View>
        <Text style={styles.subSectionTitle}>To Comply with Legal Obligations</Text>
        <Text style={styles.text}>We may process your personal information as required to comply with applicable laws, regulatory requirements, and legal proceedings, including responding to subpoenas or government requests.</Text>
        <Text style={styles.subSectionTitle}>To Optimize Our Platform</Text>
        <Text style={styles.text}>To ensure an optimal user experience, we may use your data to operate, maintain, and improve our services. Additionally, we use this information to respond to user inquiries, feedback, and provide customer support.</Text>
        <Text style={styles.sectionTitle}>Sharing of Personal Information</Text>
        <Text style={styles.text}>Bitcoin Yay does not sell or share personal information with third parties without user consent, except under the following circumstances:</Text>
        <Text style={styles.subSectionTitle}>Affiliates</Text>
        <Text style={styles.text}>We may disclose personal data to our subsidiaries and corporate affiliates as necessary to provide and improve our services.</Text>
        <Text style={styles.subSectionTitle}>Business Transfers</Text>
        <Text style={styles.text}>In the event of a business transaction such as a merger, acquisition, financing, or asset transfer, we may share personal data with the involved parties before and after the transaction.</Text>
        <Text style={styles.sectionTitle}>Compliance, Protection, and Safety</Text>
        <Text style={styles.text}>We may disclose personal information to:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Comply with applicable laws and regulatory requirements.</Text>
          <Text style={styles.bulletItem}>• Respond to lawful requests, subpoenas, or legal processes.</Text>
          <Text style={styles.bulletItem}>• Enforce our agreements, policies, and Terms of Use.</Text>
          <Text style={styles.bulletItem}>• Protect the rights, safety, and security of our users, employees, and partners.</Text>
          <Text style={styles.bulletItem}>• Address emergencies, including security breaches and fraud prevention.</Text>
        </View>
        <Text style={styles.subSectionTitle}>Professional Advisors and Service Providers</Text>
        <Text style={styles.text}>We may share information with third-party service providers that assist in operating our platform, including customer support, hosting, payment processing, identity verification (KYC), legal services, and auditing.</Text>
        <Text style={styles.subSectionTitle}>KYC Verification</Text>
        <Text style={styles.text}>To comply with regulatory requirements, we collaborate with KYC validators who verify user identities. KYC validators may be individuals or service providers who have undergone necessary compliance checks. Only the essential subset of user KYC data is shared for identity verification purpose.</Text>
        <Text style={styles.subSectionTitle}>Aggregated or De-identified Data</Text>
        <Text style={styles.text}>We may share aggregated or de-identified data that does not identify individual users for analytics, research, or business purposes.</Text>
        <Text style={styles.subSectionTitle}>Advertising Networks</Text>
        <Text style={styles.text}>While Bitcoin Yay does not directly share personal data with ad networks, third-party advertising services within our platform may request device identifiers to deliver targeted advertisements.</Text>
        <Text style={styles.subSectionTitle}>Additional User-Authorized Sharing</Text>
        <Text style={styles.text}>Users may opt to share their information with third parties. Such sharing is governed by the privacy policies of those third parties.</Text>
        <Text style={styles.subSectionTitle}>Users Outside the United States</Text>
        <Text style={styles.text}>Bitcoin Yay operates globally, and user data may be processed in jurisdictions where data protection laws may differ from those in the user's home country. By using our services, you consent to the transfer and processing of your data in accordance with this policy. EU users should refer to the "Notice to EU Data Subjects" for details on data transfers outside the European Economic Area (EEA).</Text>
        <Text style={styles.sectionTitle}>Data Security</Text>
        <Text style={styles.text}>We implement industry-standard security measures to protect personal information. However, data transmission over the internet is inherently insecure, and we cannot guarantee absolute security. Users are responsible for safeguarding their account credentials, including passwords and authentication methods. If a security breach is suspected, we may suspend account access pending investigation.</Text>
        <Text style={styles.sectionTitle}>Information Retention</Text>
        <Text style={styles.text}>We retain personal data for as long as necessary to fulfill the purposes outlined in this policy, comply with legal requirements, prevent fraud, resolve disputes, and enforce our Terms of Use. Once the retention period expires, data may be deleted or anonymized.</Text>
        <Text style={styles.sectionTitle}>User Rights and Choices</Text>
        <Text style={styles.subSectionTitle}>Access, Updates, and Deletion</Text>
        <Text style={styles.text}>Users can access and manage their personal data through their account settings. Requests for data correction, deletion, or restriction can be made via customer support.</Text>
        <Text style={styles.subSectionTitle}>Consent Withdrawal</Text>
        <Text style={styles.text}>We retain personal data for as long as necessary to fulfill the purposes outlined in this policy, comply with legal requirements, prevent fraud, resolve disputes, and enforce our Terms of Use. Once the retention period expires, data may be deleted or anonymized.</Text>
        <Text style={styles.subSectionTitle}>Tracking Technologies</Text>
        <Text style={styles.text}>Users may disable cookies and tracking technologies through browser settings. For more details, refer to our "Cookies Policy."\nFor further inquiries, please contact us at <Text style={styles.link} onPress={() => Linking.openURL('mailto:privacy@bitcoinyay.com')}>privacy@bitcoinyay.com</Text>.</Text>
        <Text style={styles.sectionTitle}>GOOGLE ANALYTICS</Text>
        <Text style={styles.text}>You may manage your preferences regarding the use of Google Analytics cookies by visiting <Text style={styles.link} onPress={() => Linking.openURL('https://tools.google.com/dlpage/gaoptout')}>Google Analytics Opt-out Browser Add-on</Text> and downloading the relevant tool.</Text>
        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
        <Text style={styles.text}>We welcome any comments or questions regarding this Privacy Policy. You can reach us at: <Text style={styles.link} onPress={() => Linking.openURL('mailto:privacy@bitcoinyay.com')}>Privacy Contact</Text>.</Text>
        <Text style={styles.sectionTitle}>CHANGES TO THIS PRIVACY POLICY</Text>
        <Text style={styles.text}>Bitcoin Yay reserves the right to modify this Privacy Policy at any time. We encourage you to periodically review this page for updates regarding our privacy practices. Any changes will be reflected in the "Last Updated" date above. Modifications will become effective upon posting or as otherwise specified at the time of publication. Your continued use of our website and services after any changes indicates your acceptance of the updated Privacy Policy.</Text>

        {/* Legal Notices */}
        <Text style={styles.sectionTitle}>Children's Privacy</Text>
        <Text style={styles.text}>Our services are not intended for, nor directed at, individuals under the age of 13. In compliance with the Children's Online Privacy Protection Act (COPPA), we do not knowingly collect personal data from individuals under 13. If we discover that we have inadvertently collected such information, we will use it solely to respond to the child or their parent/legal guardian, informing them that they cannot use our services. The data will then be promptly deleted.</Text>

        <Text style={styles.sectionTitle}>Notice to California Residents</Text>
        <Text style={styles.text}>In accordance with California Civil Code Section 1789.3, California residents may direct consumer rights inquiries to the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs:
• Address: 1625 North Market Blvd., Sacramento, CA 95834
• Phone: (916) 445-1254 or (800) 952-5210
For additional information regarding California residents' data privacy rights, please visit our <Text style={styles.link} onPress={() => Linking.openURL('https://www.bitcoinyay.com/california-privacy')}>California Consumer Privacy Notice</Text>.</Text>

        <Text style={styles.sectionTitle}>Notice to EU Data Subjects</Text>
        <Text style={styles.text}>In compliance with the General Data Protection Regulation (GDPR), Bitcoin Yay recognizes "personal information" as "personal data." Certain information you provide may be classified as "sensitive data" under the GDPR, including details such as ethnicity recorded on government-issued identification documents.</Text>
        <Text style={styles.bold}>Legal Basis for Processing:</Text>
        <Text style={styles.text}>We process personal data only when legally permitted. The following are our processing purposes and legal justifications:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Providing services – Legitimate interest</Text>
          <Text style={styles.bulletItem}>• Enabling platform features – Legitimate interest</Text>
          <Text style={styles.bulletItem}>• Communication – Legitimate interest</Text>
          <Text style={styles.bulletItem}>• Optimization & security – Legitimate interest</Text>
          <Text style={styles.bulletItem}>• Fraud prevention & compliance – Legal obligation</Text>
          <Text style={styles.bulletItem}>• Enforcing terms of service – Legitimate interest</Text>
        </View>
        <Text style={styles.text}>Where we rely on consent, you have the right to withdraw it at any time by contacting us via <Text style={styles.link} onPress={() => Linking.openURL('mailto:privacy@bitcoinyay.com')}>Privacy Contact</Text>.</Text>
        <Text style={styles.bold}>Your Rights Under GDPR:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Opt-out: Withdraw consent for marketing communications.</Text>
          <Text style={styles.bulletItem}>• Access: Request access to your personal data.</Text>
          <Text style={styles.bulletItem}>• Correction: Update or correct inaccuracies in your personal data.</Text>
          <Text style={styles.bulletItem}>• Deletion: Request the removal of your data.</Text>
          <Text style={styles.bulletItem}>• Data Portability: Obtain a machine-readable copy of your data.</Text>
          <Text style={styles.bulletItem}>• Restriction: Limit how your data is processed.</Text>
          <Text style={styles.bulletItem}>• Objection: Contest data processing based on legitimate interest.</Text>
        </View>
        <Text style={styles.text}>To exercise these rights, visit our <Text style={styles.link} onPress={() => Linking.openURL('mailto:privacy@bitcoinyay.com')}>Privacy Contact</Text>.</Text>

        <Text style={styles.sectionTitle}>Cross-Border Data Transfer</Text>
        <Text style={styles.text}>Your data may be transferred to, processed, and stored in the United States. U.S. data protection laws may differ from those in your country. Transfers from the European Economic Area (EEA) are conducted in accordance with European Commission-approved Standard Contractual Clauses or other recognized data transfer mechanisms. If you require further details on how we transfer data internationally, please contact us.</Text>
      
         {/* Cookies Policy */}
         <Text style={styles.sectionTitle}>Cookies Policy</Text>
        <Text style={styles.text}>Bitcoin Yay is committed to transparency in the use of cookies and similar tracking technologies.</Text>
        <Text style={styles.text}>Types of Cookies We Use:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Essential Cookies:</Text> Required for core website functionality.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Functional Cookies:</Text> Enhance your experience by remembering preferences.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Analytics Cookies:</Text> Collect insights into website usage and performance.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Advertising Cookies:</Text> Deliver relevant ads and improve marketing campaigns.</Text>
          <Text style={styles.bulletItem}><Text style={styles.bold}>• Security Cookies:</Text> Prevent fraud and unauthorized access.</Text>
        </View>
        <Text style={styles.text}>Managing Cookies: You can adjust cookie preferences through your browser settings. To learn how to control cookies, visit <Text style={styles.link} onPress={() => Linking.openURL('https://www.aboutcookies.org/')}>AboutCookies.org</Text>. Note that disabling cookies may impact website functionality.</Text>

        {/* Cookies Table Block */}
        <View style={styles.cookiesTableBlock}>
          <View style={styles.cookieCard}>
            <Text style={styles.cookieCardTitle}>Cookie Name</Text>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>Google Analytics</Text></View>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>Bitcoin Yay Session</Text></View>
          </View>
          <View style={styles.cookieCard}>
            <Text style={styles.cookieCardTitle}>Purpose</Text>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>Website analytics</Text></View>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>Maintain user session</Text></View>
          </View>
          <View style={styles.cookieCard}>
            <Text style={styles.cookieCardTitle}>Type</Text>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>Third-party</Text></View>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>First-party</Text></View>
          </View>
          <View style={styles.cookieCard}>
            <Text style={styles.cookieCardTitle}>Duration</Text>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>2 years</Text></View>
            <View style={styles.cookieCardRow}><Text style={styles.cookieCardText}>9 days</Text></View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 15,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  bulletList: {
    marginLeft: 10,
    marginBottom: 10,
  },
  bulletItem: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
    marginLeft: 10,
  },
  bold: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  link: {
    color: '#F88D39',
    textDecorationLine: 'underline',
  },
  cookiesTableBlock: {
    marginTop: 20,
    justifyContent: 'space-between',

  },
  cookieCard: {
    width: '100%',
  
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    paddingBottom: 10,
    marginBottom: 40,
  },
  cookieCardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    backgroundColor: '#252525',
    padding: 10,
  },
  cookieCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  cookieCardText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});

export default PrivacyScreen;
