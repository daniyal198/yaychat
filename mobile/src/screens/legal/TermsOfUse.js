//import {useNavigation} from '@react-navigation/native';
//import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';

//import {RootStackParamsList} from '../../RootNavigator';

// type StartScreenNavigationProp = StackNavigationProp<
//   RootStackParamsList,
//   'Home'
// >;

const TermsOfUse = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.notice}><Text style={styles.noticeHighlight}>IMPORTANT NOTICE:</Text> THESE TERMS OF SERVICE INCLUDE A BINDING ARBITRATION CLAUSE AND A WAIVER OF CLASS ACTION RIGHTS (SEE SECTION 15). PLEASE READ CAREFULLY BEFORE USING OUR SERVICES.</Text>

      <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
      <Text style={styles.text}>
        Welcome to Bitcoin Yay ("Company," "we," "us," "our"). These Terms of Service ("Terms") govern your access to and use of Bitcoin Yay's website, platform, mobile applications, and all related services (collectively, the "Service").
        {'\n'}By using or accessing the Service, you agree to these Terms and our Privacy Policy. If you do not agree, you may not use the Service. Your continued use of the Service constitutes acceptance of any updates to these Terms.
      </Text>

      <Text style={styles.sectionTitle}>2. Modification of Terms</Text>
      <Text style={styles.text}>
        We reserve the right to modify these Terms at any time. The latest version will be posted on our website. Your continued use of the Service after modifications signifies your acceptance of the updated Terms.
      </Text>

      <Text style={styles.sectionTitle}>3. Eligibility</Text>
      <Text style={styles.text}>
        You must be at least 18 years old and legally capable of entering into a binding agreement to use the Service. By using Bitcoin Yay, you represent that you comply with all applicable laws and regulations in your jurisdiction.
      </Text>

      <Text style={styles.sectionTitle}>4. Account Security</Text>
      <Text style={styles.text}>
        To use certain features, you may need to create an account. You are responsible for maintaining the confidentiality of your account credentials and are fully responsible for all activities that occur under your account. Notify us immediately of any unauthorized access.
      </Text>

      <Text style={styles.sectionTitle}>5. User Content</Text>
      <Text style={styles.text}>
        By submitting content ("User Content") to Bitcoin Yay, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display it as part of the Service. You warrant that you own or have the necessary rights to submit such content and that it does not infringe any third-party rights.
      </Text>

      <Text style={styles.sectionTitle}>6. Prohibited Activities</Text>
      <Text style={styles.text}>
        When using the Service, you agree not to:
      </Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>• Violate any applicable laws or regulations.</Text>
        <Text style={styles.bulletItem}>• Use the Service for fraudulent or illegal activities.</Text>
        <Text style={styles.bulletItem}>• Interfere with the security or functionality of the Service.</Text>
        <Text style={styles.bulletItem}>• Post misleading, false, or harmful content.</Text>
      </View>
      <Text style={styles.text}>We reserve the right to terminate accounts and take legal action against violation.</Text>

      <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
      <Text style={styles.text}>
        All content provided by Bitcoin Yay, including but not limited to logos, designs, and software, is owned by us or our licensors and protected by intellectual property laws. You may not use, copy, or distribute our content without permission.
      </Text>

      <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
      <Text style={styles.text}>
        Bitcoin Yay may include links to third-party services. We do not endorse or control these third parties and are not responsible for their practices. Use them at your own risk.
      </Text>

      <Text style={styles.sectionTitle}>9. Disclaimers</Text>
      <Text style={styles.text}>
        The Service is provided "as is" and "as available." We do not guarantee uninterrupted, error-free service. We disclaim all warranties to the fullest extent permitted by law.
      </Text>

      <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
      <Text style={styles.text}>
        Bitcoin Yay is not liable for any direct, indirect, incidental, or consequential damages resulting from your use of the Service, except where prohibited by law.
      </Text>

      <Text style={styles.sectionTitle}>11. Indemnification</Text>
      <Text style={styles.text}>
        You agree to indemnify and hold Bitcoin Yay harmless from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
      </Text>

      <Text style={styles.sectionTitle}>12. Termination</Text>
      <Text style={styles.text}>
        We may suspend or terminate your access to the Service at any time for any reason, including violations of these Terms.
      </Text>

      <Text style={styles.sectionTitle}>13. Governing Law</Text>
      <Text style={styles.text}>
        These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.
      </Text>

      <Text style={styles.sectionTitle}>14. Dispute Resolution</Text>
      <Text style={styles.text}>
        Disputes will be resolved through binding arbitration in accordance with the rules of [Arbitration Organization]. You waive any right to participate in a class action lawsuit.
      </Text>

      <Text style={styles.sectionTitle}>15. Contact Information</Text>
      <Text style={styles.text}>
        For any questions about these Terms, contact us at [Support Email].
        {'\n'}By using Bitcoin Yay, you agree to these Terms of Service.
      </Text>

      {/* Acceptable Use Section */}
      <Text style={styles.sectionTitle}>Acceptable Use</Text>
      <Text style={styles.text}>
        By using Bitcoin Yay, you agree to abide by the following rules. You must not:
      </Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>(i) Copy, reproduce, distribute, modify, adapt, translate, reverse-engineer, decompile, disassemble, create derivative works based on, or attempt to discover the source code of any part of the Bitcoin Yay website, services, or content.</Text>
        <Text style={styles.bulletItem}>(ii) Use the platform to send, store, or share unlawful, infringing, obscene, defamatory, or threatening material, including content that violates third-party rights.</Text>
        <Text style={styles.bulletItem}>(iii) Introduce viruses, worms, Trojan horses, or any other malicious code that disrupts the security, integrity, or functionality of Bitcoin Yay or its users.</Text>
        <Text style={styles.bulletItem}>(iv) Use the platform in violation of any applicable local, state, national, or international laws, rules, or regulations.</Text>
        <Text style={styles.bulletItem}>(v) Engage in fraudulent activities, including but not limited to the creation of fake accounts, using automated scripts or bots, or engaging in deceptive practices.</Text>
        <Text style={styles.bulletItem}>(vi) Sell, transfer, or acquire user accounts in an unauthorized manner.</Text>
        <Text style={styles.bulletItem}>(vii) Participate in unauthorized sales, transfers, or trading of digital assets through Bitcoin Yay.</Text>
      </View>
      <Text style={styles.text}>Failure to adhere to these terms may result in account suspension, termination of access, or the reversal of transactions at Bitcoin Yay's discretion.</Text>

      {/* Representations, Warranties, and Risks */}
      <Text style={styles.sectionTitle}>Representations, Warranties, and Risks</Text>
      <Text style={styles.subSectionTitle}>Warranty Disclaimer</Text>
      <Text style={styles.text}>Bitcoin Yay provides its website, services, and content on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, including but not limited to merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee uninterrupted or error-free access to the platform.</Text>
      <Text style={styles.subSectionTitle}>Risks Associated with Cryptographic Systems</Text>
      <Text style={styles.text}>By using Bitcoin Yay, you acknowledge that you understand the inherent risks associated with blockchain technology and digital assets. You confirm that you have experience with cryptographic tokens, smart contracts, and decentralized technologies.</Text>
      <Text style={styles.subSectionTitle}>Regulatory Risks</Text>
      <Text style={styles.text}>Regulatory changes in various jurisdictions may impact the availability, accessibility, or functionality of Bitcoin Yay. You acknowledge that legal developments may affect the platform and accept all associated risks.</Text>
      <Text style={styles.subSectionTitle}>Security Risks</Text>
      <Text style={styles.text}>Cryptographic systems are subject to vulnerabilities. Advances in computing, including quantum technology, may pose risks to blockchain security. While Bitcoin Yay takes reasonable security measures, we do not guarantee protection against all potential threats.</Text>
      <Text style={styles.subSectionTitle}>Volatility of Digital Assets</Text>
      <Text style={styles.text}>You understand that cryptocurrencies are highly volatile due to market factors, adoption rates, speculation, and regulatory changes. Bitcoin Yay is not responsible for any financial losses resulting from price fluctuations.</Text>
      <Text style={styles.text}>You acknowledge that blockchain applications, including Bitcoin Yay, may have coding vulnerabilities. You are responsible for evaluating any third-party tools, services, or smart contracts you interact with through our platform.</Text>

      {/* Waiver, Release, and Indemnity */}
      <Text style={styles.sectionTitle}>Waiver, Release, and Indemnity</Text>
      <Text style={styles.text}>By using Bitcoin Yay, you agree to release and waive any claims against Bitcoin Yay, its affiliates, officers, employees, and agents for any losses or damages arising from your use of the platform. You further agree to indemnify and hold Bitcoin Yay harmless from any claims, damages, or expenses resulting from your violation of these terms or your misuse of the services.</Text>

      {/* Limitation of Liability */}
      <Text style={styles.sectionTitle}>Limitation of Liability</Text>
      <Text style={styles.text}>Bitcoin Yay is not liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to loss of profits, data, or digital assets. Some jurisdictions may not allow the exclusion of certain liabilities, so some of these limitations may not apply to you.</Text>

      {/* Intellectual Property Rights */}
      <Text style={styles.sectionTitle}>Intellectual Property Rights</Text>
      <Text style={styles.text}>All content, trademarks, logos, and intellectual property associated with Bitcoin Yay are owned by Bitcoin Yay or its licensors. You may not use, copy, or distribute any of these materials without prior written consent.</Text>

      {/* Third-Party Links */}
      <Text style={styles.sectionTitle}>Third-Party Links</Text>
      <Text style={styles.text}>Bitcoin Yay may provide links to third-party websites or services. We do not endorse, control, or assume responsibility for any content or practices of these external platforms. Your use of third-party resources is at your own risk.</Text>

      {/* Account Termination and Suspension */}
      <Text style={styles.sectionTitle}>Account Termination and Suspension</Text>
      <Text style={styles.text}>Bitcoin Yay reserves the right to suspend or terminate your account at its sole discretion, with or without notice, if you violate these terms or engage in activities deemed harmful to the platform or its users. In the event of termination, you agree to forfeit access to any associated services or features. Certain provisions, including but not limited to warranty disclaimers, indemnities, and limitations of liability, shall survive termination.</Text>

      {/* No Third-Party Beneficiaries */}
      <Text style={styles.sectionTitle}>No Third-Party Beneficiaries</Text>
      <Text style={styles.text}>Except as expressly stated in these Terms, no third party shall have any rights or benefits under these Terms.</Text>

      {/* Copyright Infringement Claims */}
      <Text style={styles.sectionTitle}>Copyright Infringement Claims</Text>
      <Text style={styles.text}>If you believe your copyright, or that of an individual or entity you represent, has been infringed on the Bitcoin Yay platform, please submit a written notice ("Notice") to our Copyright Agent containing the following details:</Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>• A description of the copyrighted work or intellectual property allegedly infringed, along with the requested action.</Text>
        <Text style={styles.bulletItem}>• A description of where the infringing material is located on the Bitcoin Yay platform.</Text>
        <Text style={styles.bulletItem}>• Your name, address, telephone number, and email address.</Text>
        <Text style={styles.bulletItem}>• Documentation verifying ownership of the copyrighted material issued by the relevant authority.</Text>
        <Text style={styles.bulletItem}>• A statement affirming your good faith belief that the disputed use is unauthorized by the copyright owner, agent, or law.</Text>
        <Text style={styles.bulletItem}>• A declaration, made under penalty of perjury, confirming the accuracy of the information in the Notice and your authorization to act on behalf of the copyright owner.</Text>
        <Text style={styles.bulletItem}>• Your electronic or physical signature.</Text>
      </View>
      <Text style={styles.text}><Text style={styles.noticeHighlight}>Copyright Agent Contact:</Text>{'\n'}[Bitcoin Yay Copyright Agent]{'\n'}[support@bitcoinyay.com]</Text>

      {/* Binding Arbitration and Class Action Waiver */}
      <Text style={styles.sectionTitle}>Binding Arbitration and Class Action Waiver</Text>
      <Text style={styles.textBold}>PLEASE READ THIS SECTION CAREFULLY – IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT.</Text>
      <Text style={styles.text}>If you believe your copyright, or that of an individual or entity you represent, has been infringed on the Bitcoin Yay platform, please submit a written notice ("Notice") to our Copyright Agent containing the following details:</Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>• A description of the copyrighted work or intellectual property allegedly infringed, along with the requested action.</Text>
        <Text style={styles.bulletItem}>• A description of where the infringing material is located on the Bitcoin Yay platform.</Text>
        <Text style={styles.bulletItem}>• Your name, address, telephone number, and email address.</Text>
        <Text style={styles.bulletItem}>• Documentation verifying ownership of the copyrighted material issued by the relevant authority.</Text>
        <Text style={styles.bulletItem}>• A statement affirming your good faith belief that the disputed use is unauthorized by the copyright owner, agent, or law.</Text>
        <Text style={styles.bulletItem}>• A declaration, made under penalty of perjury, confirming the accuracy of the information in the Notice and your authorization to act on behalf of the copyright owner.</Text>
        <Text style={styles.bulletItem}>• Your electronic or physical signature.</Text>
      </View>
      <Text style={styles.text}><Text style={styles.noticeHighlight}>Copyright Agent Contact:</Text>{'\n'}[Bitcoin Yay Copyright Agent]{'\n'}[support@bitcoinyay.com]</Text>

      {/* Arbitration Details */}
      <Text style={styles.subSectionTitle}>Initial Dispute Resolution</Text>
      <Text style={styles.text}>Before initiating legal proceedings, the parties shall attempt to resolve disputes in good faith through direct negotiation.</Text>
      <Text style={styles.subSectionTitle}>Arbitration Agreement</Text>
      <Text style={styles.text}>If a resolution is not reached within 30 days, either party may initiate binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. Arbitration shall be the sole means of dispute resolution, excluding any class action proceedings.</Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>• The arbitrator shall have exclusive authority over disputes, including enforceability and interpretation of these Terms.</Text>
        <Text style={styles.bulletItem}>• The arbitrator may grant the same remedies as a court.</Text>
        <Text style={styles.bulletItem}>• The decision shall be binding and enforceable in any competent court.</Text>
      </View>
      <Text style={styles.text}>By agreeing to arbitration, you waive your right to a jury trial. Arbitration may involve higher costs and limited discovery compared to court proceedings.</Text>
      <Text style={styles.subSectionTitle}>Location</Text>
      <Text style={styles.text}>Arbitration will be conducted in California, and you agree to jurisdiction in San Mateo County, California, for arbitration-related matters.</Text>
      <Text style={styles.subSectionTitle}>Class Action Waiver</Text>
      <Text style={styles.text}>All arbitration proceedings must be conducted on an individual basis. Class actions or collective claims are not permitted. If any part of this waiver is found unenforceable, the arbitration clause shall be null and void.</Text>
      <Text style={styles.subSectionTitle}>Exceptions</Text>
      <Text style={styles.text}>This arbitration agreement does not apply to intellectual property claims or small claims court matters.</Text>
      <Text style={styles.subSectionTitle}>Opt-Out Right</Text>
      <Text style={styles.text}>You may opt out of arbitration by submitting written notice to [support@bitcoinyay.com] within 30 days of your first use of Bitcoin Yay. Opting out does not affect other Terms provisions.</Text>
      <Text style={styles.subSectionTitle}>Amendments to Arbitration Terms</Text>
      <Text style={styles.text}>Bitcoin Yay may modify this section with 30 days' notice. Changes will apply prospectively to new claims only. For disputes not subject to arbitration, the exclusive jurisdiction shall be federal and state courts in San Francisco, California.</Text>

      {/* General Terms */}
      <Text style={styles.sectionTitle}>General Terms</Text>
      <Text style={styles.subSectionTitle}>Entire Agreement</Text>
      <Text style={styles.text}>These Terms, along with any additional policies on the site, constitute the complete agreement between you and Bitcoin Yay.</Text>
      <Text style={styles.subSectionTitle}>Waiver and Severability</Text>
      <Text style={styles.text}>Failure to enforce any provision does not constitute a waiver. If any term is deemed invalid, the remainder of the Terms shall remain in effect.</Text>
      <Text style={styles.subSectionTitle}>Governing Law</Text>
      <Text style={styles.text}>These Terms are governed by California law, excluding conflict of law principles.</Text>
      <Text style={styles.subSectionTitle}>Statute of Limitations</Text>
      <Text style={styles.text}>Any claim related to these Terms must be filed within one (1) year from the event giving rise to the claim, or it shall be permanently barred.</Text>
      <Text style={styles.subSectionTitle}>Communications</Text>
      <Text style={styles.text}>For questions or concerns regarding Bitcoin Yay, contact [support@bitcoinyay.com].</Text>
      <Text style={styles.subSectionTitle}>Exceptions</Text>
      <Text style={styles.text}>This arbitration agreement does not apply to intellectual property claims or small claims court matters.</Text>
      <Text style={styles.sectionTitle}>Restrictions on Transfers During Enclosed Period</Text>
      <Text style={styles.text}>If you have passed KYC and migrated Bitcoin Yay tokens during the enclosed period, you agree to the following:</Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>• You will not sell Bitcoin Yay tokens for fiat or cryptocurrencies before the Open Network launch.</Text>
        <Text style={styles.bulletItem}>• You are the sole holder of your account and wallet and will not transfer or share access during the enclosed period.</Text>
        <Text style={styles.bulletItem}>• You will not engage in illegal or unauthorized transactions using Bitcoin Yay tokens.</Text>
      </View>
      <Text style={styles.text}>Violation of these terms may result in account suspension, forfeiture of tokens, and other corrective actions deemed necessary by Bitcoin Yay.</Text>
      <Text style={styles.sectionTitle}>Mobile Balance and Token Migration</Text>
      <Text style={styles.text}>Before KYC, your activity on Bitcoin Yay generates a non-transferable "Mobile Balance," which has no cash or exchange value. Mobile Balance does not confer ownership rights. Upon successful KYC verification, eligible users may migrate Mobile Balance into Bitcoin Yay tokens. However, the following conditions apply:</Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>• You must complete KYC and comply with anti-money laundering policies.</Text>
        <Text style={styles.bulletItem}>• You must not violate Bitcoin Yay's Terms.</Text>
        <Text style={styles.bulletItem}>• Your Mobile Balance must be verifiable and free from fraudulent activity.</Text>
        <Text style={styles.bulletItem}>• Your jurisdiction must permit cryptocurrency use.</Text>
      </View>
      <Text style={styles.text}>If these conditions are not met, your migration may be denied, and your Mobile Balance forfeited.</Text>
      <Text style={styles.sectionTitle}>Grace Period and Forfeiture</Text>
      <Text style={styles.text}>Bitcoin Yay users must complete KYC and token migration within the announced Grace Period. Failure to meet these requirements will result in forfeiture of Mobile Balance. Additionally, your Mobile Balance will be immediately forfeited if:</Text>
      <View style={styles.bulletList}>
        <Text style={styles.bulletItem}>• You refuse to execute the Token Transfer Agreement.</Text>
        <Text style={styles.bulletItem}>• You fail to pass KYC.</Text>
        <Text style={styles.bulletItem}>• You engage in fraudulent activity or misrepresent your Mobile Balance.</Text>
        <Text style={styles.bulletItem}>• You relocate to a jurisdiction that prohibits cryptocurrency use.</Text>
      </View>
      <Text style={styles.text}>By using Bitcoin Yay, you acknowledge and agree to these Terms. Failure to comply may result in the suspension or termination of your account.</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  notice: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 30,
    marginTop: 10,
    fontWeight: '400',
  },
  noticeHighlight: {
    color: '#FF9900',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 40,
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#D5D5D5',
    marginBottom: 18,
    lineHeight: 26,
  },
  textBold: {
    fontSize: 16,
    color: '#D5D5D5',
    marginBottom: 18,
    lineHeight: 26,
    fontWeight: 'bold',
  },
  bulletList: {
    marginLeft: 10,
    marginBottom: 10,
  },
  bulletItem: {
    fontSize: 16,
    color: '#D5D5D5',
    marginBottom: 6,
    marginLeft: 10,
    lineHeight: 24,
  },
});

export default TermsOfUse;
