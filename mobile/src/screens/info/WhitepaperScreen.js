//import {useNavigation} from '@react-navigation/native';
//import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {View, Text, StyleSheet, ScrollView, Image, Linking} from 'react-native';
import {colors} from '../../theme/colors';
import YayCoin from '../../../assets/img/yay-coins.svg';
import Gopher from '../../../assets/img/gopher-4.svg';

//import {RootStackParamsList} from '../../RootNavigator';

// type StartScreenNavigationProp = StackNavigationProp<
//   RootStackParamsList,
//   'Home'
// >;

const WhitePaperScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Bitcoin-Yay: A Decentralized{'\n'}Ecosystem Coin
        </Text>

        <Text style={styles.sectionTitle}>Abstract</Text>
        <Text style={styles.text}>
          Bitcoin-Yay (BTCY) is a decentralized cryptocurrency designed as the
          foundation of a next-generation blockchain ecosystem. Built on the
          Stellar blockchain, Bitcoin-Yay enables fast, low-cost transactions
          while incorporating features like AI-driven mining, smart contracts,
          and decentralized governance. This white paper details the design,
          implementation, tokenomics, security, and governance of Bitcoin-Yay,
          aiming to create a sustainable, community-driven financial network.
        </Text>

        <View style={styles.imageContainer}>
          {/* You'll need to add the actual image here */}
          <Image
            source={require('../../../assets/img/gopher-01.png')}
            style={styles.image}
          />
        </View>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.text}>
          The cryptocurrency industry has evolved significantly, but challenges
          such as scalability, transaction fees, and sustainability persist.
          Bitcoin-Yay seeks to address these by leveraging Stellar's
          high-performance blockchain and incorporating AI-based mechanisms for
          mining, governance, and transactions.{'\n\n'}
          Bitcoin-Yay serves as the core currency within the ecosystem, powering
          transactions, governance, rewards, and decentralized finance (DeFi)
          applications. Unlike traditional proof-of-work (PoW) blockchains,
          Bitcoin-Yay adopts a Proof-of-Participation (PoP) model, making it
          more energy-efficient and inclusive.{'\n\n'}
          Bitcoin-Yay follows Bitcoin's performance while being backed by the
          Indexx Trading Bot to maintain value stability and market efficiency.
        </Text>
        <Image
          source={require('../../../assets/img/yey-01.png')}
          style={styles.image}
        />
        <Text style={styles.sectionTitle}>2. Core Features of Bitcoin-Yay</Text>

        <Text style={styles.subsectionTitle}>
          2.1 Fast and Scalable Transactions
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Built on the Stellar blockchain, which enables 1,000+ transactions
            per second (TPS).
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Low-cost transactions due to Stellar's efficient consensus model.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Supports cross-border payments and remittances.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          2.2 AI-Powered Proof-of-Participation (PoP) Mining
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-based mining replaces traditional mining mechanisms.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Users earn BTCY through engagement, transactions, and holding
            tokens.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            No energy-intensive mining—enhancing sustainability.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Users can mine BTCY on mobile devices (iOS, Android) and web similar
            to Pi Network.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          2.3 Smart Contracts via Soroban
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Enables programmable transactions and decentralized applications
            (dApps).
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Supports automated staking, lending, and DeFi protocols.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Low execution costs compared to Ethereum's gas fees.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          2.4 Decentralized Governance (DAO)
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Token-based voting allows community participation in
            decision-making.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Holders of BTCY can propose and vote on ecosystem upgrades.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            No centralized authority—fully decentralized decision-making.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          2.5 Interoperability & Cross-Chain Compatibility
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Seamless asset bridging between Bitcoin-Yay, Bitcoin-YeeHaw
            (Stablecoin), and WiBS (Meme Coin).
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Integrates with major Ethereum, Binance Smart Chain, and Solana
            networks.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          2.6 Security & Sustainability
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Stellar's Federated Byzantine Agreement (FBA) ensures high security.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Transactions are validated by trusted nodes, preventing attacks.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Self-sustaining economic model with long-term sustainability.
          </Text>
        </View>

        <View style={styles.imageContainer}>
          {/* <Image
            source={require('../../../assets/img/helmet-01.png')}
            style={styles.image}
          /> */}
        </View>
        <Image
          source={require('../../../assets/img/helmet01.png')}
          style={styles.image}
        />
        <Text style={styles.sectionTitle}>3. Product Ecosystem</Text>

        <Text style={styles.subsectionTitle}>Indexx Mining App</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered mining algorithm with energy-efficient mining.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Fraud detection to prevent bot-based mining abuse.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Smart mining subscriptions for premium mining speeds.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Wallet</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Multi-chain support for BTCY, BTC, ETH, INEX, etc.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered risk analysis and auto-staking features.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Smart spending assistant for optimal buy/sell timing.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx CEX</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered centralized exchange with Buy, Sell, Convert, and Smart
            APY features.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-driven automated yield optimization for investment portfolios.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            High-speed trading engine with real-time risk management.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx DEX</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Peer-to-peer AI-enhanced decentralized exchange.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Lightning-fast transactions and integrated flat on/off ramp.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered arbitrage trading and market predictions.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Block Explorer AI</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered fraud detection and smart contract auditing.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            User-friendly interface for blockchain analytics.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx AI Browser</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Web3 search engine and decentralized app store.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Built-in AI assistant for Web3 navigation.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Connect</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Decentralized AI-driven social media platform.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Spam-free, AI-curated content filtering.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Smart advertising with AI-powered targeting.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Brainstorm AI</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Community-driven DApp innovation platform.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI voting system for funding new projects.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Shop</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered marketplace for gift cards, greeting cards, and crypto
            cards.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Multi-currency support including BTCY, BTC, ETH, and USDT.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Pay</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Crypto debit card with Visa/Mastercard integration.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered expense tracking and instant cash withdrawal.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          Indexx AI Smart Crypto/ Crypto Treasury
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-managed investment portfolios and risk analysis.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Automated yield farming and staking for passive earnings.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Developer Hub</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-assisted developer platform for smart contracts.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Grants and funding for DApp development.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx Lotto</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered lottery system with predictive analytics.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Blockchain-based fair draws and community jackpots.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Indexx DAO / Hive</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-powered governance and transparent voting.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Community-driven proposal system and token rewards.
          </Text>
        </View>
        <Image
          source={require('../../../assets/img/whoInvitedYou.png')}
          style={styles.image}
        />

        <Text style={styles.sectionTitle}>4. Technical Architecture</Text>
        <Text style={styles.text}>
          Bitcoin-Yay operates on the Stellar blockchain, utilizing the
          following components:
        </Text>

        <Text style={styles.subsectionTitle}>4.1 Consensus Mechanism</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Federated Byzantine Agreement (FBA) allows fast, secure, and
            scalable consensus.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Eliminates the need for energy-intensive mining.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          4.2 Token Issuance & Distribution
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Bitcoin-Yay is issued as a native Stellar asset.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Total Supply: 210,000,000,000 BTCY (Fixed supply). - 21 trillion
            Distribution:
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            50% - Mining Rewards (Proof-of-Participation)
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>25% - Ecosystem Development</Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            10% - Community & DAO Treasury(Airdrop)
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            10% - Partnerships & Marketing(Social Media Influencers)
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>5% - Team & Advisors</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            All the above distributions are stored in multiple secured wallets
            for enhanced security and decentralized access control.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Bitcoin-Yay Token Conversion Ratio: 1 BTC = 1,000,000 Bitcoin Yay
            (BTCY)
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            For reference, if you own 21 million BTC, your converted holdings in
            BTCY would be:
          </Text>
        </View>

        <View style={styles.conversionBox}>
          <Text style={styles.conversionText}>
            21,000,000 BTC × 1,000,000 BTCY/BTC = 21,000,000,000,000{'\n'}
            BTCY That is 21 trillion BTCY in total supply.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          4.3 Smart Contracts on Soroban
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Automated staking and yield farming.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>Cross-chain transactions.</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>Programmable governance models</Text>
        </View>

        <Text style={styles.subsectionTitle}>
          4.4 Decentralized Identity & Privacy
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Zero-Knowledge Proofs (ZKP) ensure transaction privacy.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Non-custodial wallets for user security
          </Text>
        </View>
        <Gopher />
        <Text style={styles.sectionTitle}>5. Economic Model & Tokenomics</Text>
        <Text style={styles.text}>
          Bitcoin-Yay is designed to be deflationary and value-accretive, with
          mechanisms ensuring long-term stability.
        </Text>

        <Text style={styles.subsectionTitle}>5.1 Tokenomics</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Bitcoin-Yay (BTCY) Start Price: $0.21
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Supply Model: Controlled emission with deflationary mechanisms.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Mining Rewards: AI-moderated to maintain balance and scarcity.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          5.2 Subscription-Based Mining Plans
        </Text>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Plan</Text>
            <Text style={styles.tableHeaderCell}>Speed Boost</Text>
            <Text style={styles.tableHeaderCell}>Cost</Text>
            <Text style={styles.tableHeaderCell}>Benefits</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Free</Text>
            <Text style={styles.tableCell}>1x</Text>
            <Text style={styles.tableCell}>$0</Text>
            <Text style={styles.tableCell}>Standard mining</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Silver</Text>
            <Text style={styles.tableCell}>2x</Text>
            <Text style={styles.tableCell}>$50/m</Text>
            <View style={styles.tableCellMultiline}>
              <Text style={styles.tableCellText}>Faster mining</Text>
              <Text style={styles.tableCellText}>Priority transactions</Text>
            </View>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Gold</Text>
            <Text style={styles.tableCell}>3x</Text>
            <Text style={styles.tableCell}>$100/m</Text>
            <View style={styles.tableCellMultiline}>
              <Text style={styles.tableCellText}>High Speed mining</Text>
              <Text style={styles.tableCellText}>Priority withdrawals</Text>
            </View>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Platinum</Text>
            <Text style={styles.tableCell}>5x</Text>
            <Text style={styles.tableCell}>$250/m</Text>
            <View style={styles.tableCellMultiline}>
              <Text style={styles.tableCellText}>Ultra Fast mining</Text>
              <Text style={styles.tableCellText}>VIP support</Text>
            </View>
          </View>
        </View>

        <Text style={styles.subsectionTitle}>5.3 Incentives for Users</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>Airdrops & Referral Rewards</Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            AI-Powered Yield Farming & Staking
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>Exclusive DAO Membership Perks</Text>
        </View>

        <Text style={styles.subsectionTitle}>5.4 Deflationary Model</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Token burns to reduce supply and increase scarcity.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Mining reward halving every 1 year/6 months to control inflation.
          </Text>
        </View>
        <YayCoin />
        <Text style={styles.sectionTitle}>
          6. Withdrawal Rules & Vetting System
        </Text>
        <Text style={styles.text}>
          To maintain network stability, prevent spam withdrawals, and ensure
          fair distribution, Bitcoin-Yay (BTCY) implements a structured
          withdrawal and usage vetting system.
        </Text>

        <Text style={styles.subsectionTitle}>
          Minimum Withdrawal Threshold:
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Users must accumulate at least 1 million BTCY before they can
            initiate withdrawals or begin using BTCY for trading, payments, or
            ecosystem activities.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Phased Withdrawal System:</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Users cannot withdraw the entire 1 million BTCY at once. Instead,
            withdrawals are vested over 6 months to prevent excessive sell- offs
            and ensure gradual token release.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Each withdrawal request undergoes automated vetting to detect
            fraudulent activities or bot-driven mass withdrawals.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          Vesting Schedule (Example for 1 million BTCY):
        </Text>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Month</Text>
            <Text style={styles.tableHeaderCell}>Max Withdrawable BTCY</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Month 1</Text>
            <Text style={styles.tableCell}>100000</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Month 2</Text>
            <Text style={styles.tableCell}>150000</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Month 3</Text>
            <Text style={styles.tableCell}>200000</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Month 4</Text>
            <Text style={styles.tableCell}>200000</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Month 5</Text>
            <Text style={styles.tableCell}>200000</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Month 6</Text>
            <Text style={styles.tableCell}>150000</Text>
          </View>
        </View>

        <Text style={styles.subsectionTitle}>Usage Across Ecosystem:</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Once users reach 1 million BTCY, they can start using their tokens
            for:
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Trading on Indexx Exchange & Indexx Decentralized Exchange(DEX)
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Spending on Indexx Shop (crypto gift cards,greeting cards)
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>Lottery (Indexx Lotto)</Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            NFT marketplace(Indexx XNFT marketplace)
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>Staking & Yield Farming</Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Participation in Governance via the DAO
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>Withdrawal Fees</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            BTCY withdrawals are subject to network fees based on withdrawal
            amounts:
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            10% Fee for immediate withdrawal.
          </Text>
        </View>
        <View style={[styles.bulletContainer, {paddingLeft: 30}]}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            3% Fee for vested withdrawals following the 6-month schedule.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          7. Roadmap & Implementation Plan
        </Text>

        <Text style={styles.subsectionTitle}>
          Phase 1: Development & Alpha Testing (2025-2026)
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Deploy AI-powered mining system.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Launch Mining application on Android and iOS Device.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Establish smart contract functionality.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          Phase 2: Expansion & Market Adoption (2026-2027)
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Integrate with different blockchain networks.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Introducing Chat, Browser, and AI Wallet.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Enable real-world transactions with Indexx Pay.
          </Text>
        </View>

        <Text style={styles.subsectionTitle}>
          Phase 3: Mass Adoption & Governance (2027-2029)
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Expand decentralized governance framework.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Reach $200 billion market valuation.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Establish partnerships with financial institutions and merchants
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          8. Future Developments & Community Engagement
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Research & Development for improved AI-based mining algorithms.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Partnership programs for merchants accepting BTCY as payment.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Expansion of DeFi and staking functionalities for better yield
            farming.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bullet}>• </Text>
          <Text style={styles.bulletText}>
            Ongoing security audits and enhancements to improve trust and safety
          </Text>
        </View>

        <Text style={styles.sectionTitle}>9. Conclusion</Text>
        <Text style={styles.text}>
          Bitcoin-Yay (BTCY) represents a new wave of blockchain ecosystems with
          fast transactions, AI-based mining, and decentralized governance.
          Leveraging Stellar's robust infrastructure, it enables scalable,
          sustainable, and secure financial interactions. With its deflationary
          model, cross-chain compatibility, and user-friendly mining approach,
          Bitcoin-Yay is set to redefine how decentralized economies operate.
        </Text>

        <Text style={styles.subsectionTitle}>
          Join the Bitcoin-Yay Ecosystem Today
        </Text>

        <View style={styles.socialLinksContainer}>
  <View style={styles.socialLink}>
    <Text style={styles.socialIcon}>🌐</Text>
    <Text style={styles.socialText} onPress={() => Linking.openURL('https://bitcoinyay.com/')}>
      Website: <Text style={styles.link}>https://bitcoinyay.com/</Text>
    </Text>
  </View>
  <View style={styles.socialLink}>
    <Text style={styles.socialIcon}>📝</Text>
    <Text style={styles.socialText}>
      GitHub: <Text style={styles.link}>[Coming Soon]</Text>
    </Text>
  </View>
  <View style={styles.socialLink}>
    <Text style={styles.socialIcon}>✈️</Text>
    <Text style={styles.socialText} onPress={() => Linking.openURL('https://t.me/+pC3IVlPlwSEyODAx')}>
      Telegram: <Text style={styles.link}>https://t.me/+pC3IVlPlwSEyODAx</Text>
    </Text>
  </View>
  <View style={styles.socialLink}>
    <Text style={styles.socialIcon}>🐦</Text>
    <Text style={styles.socialText} onPress={() => Linking.openURL('https://x.com/bitcoin_YAY')}>
      Twitter: <Text style={styles.link}>https://x.com/bitcoin_YAY</Text>
    </Text>
  </View>
</View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d5d5d5',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d5d5d5',
    marginTop: 25,
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d5d5d5',
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    lineHeight: 20,
    color: '#d5d5d5',
    marginBottom: 20,
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 10,
  },
  bullet: {
    fontSize: 12,
    color: '#d5d5d5',
    marginRight: 8,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#d5d5d5',
    flex: 1,
  },
  imageContainer: {
    alignItems: 'flex-start',
    marginVertical: 20,
  },
  link: {
  color: 'blue',
  textDecorationLine: 'underline',
},
  image: {
    // width: '100%',
    height: 100,
    resizeMode: 'contain',
    alignSelf: 'flex-start',
  },
  conversionBox: {
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  conversionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#d5d5d5',
  },
  tableContainer: {
    marginVertical: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    flex: 1,
    color: '#d5d5d5',
    fontWeight: '500',
    fontSize: 12,
    textAlign: 'left',
    paddingBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    textAlign: 'left',
    color: '#d5d5d5',
  },
  tableCellMultiline: {
    flex: 1,
    paddingVertical: 10,
  },
  tableCellText: {
    color: '#d5d5d5',
    textAlign: 'left',
    marginBottom: 4,
  },
  socialLinksContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  socialIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  socialText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default WhitePaperScreen;
