import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Linking} from 'react-native';
import {DrawerContentScrollView} from '@react-navigation/drawer';
import {colors} from '../theme/colors';
import Mine_yay from '../../assets/img/mine_yay.svg';
import Chat from '../../assets/img/chat.svg';
import Paper from '../../assets/img/whitePaperIcon.svg';
import Support from '../../assets/img/supportIcon.svg';
import Profile from '../../assets/img/ProfileIcon.svg';
import Roles from '../../assets/img/roles_v2.svg';

import Mainnet from '../../assets/img/rocket_icon.svg';
import Faq from '../../assets/img/faqIcon.svg';
import Billing from '../../assets/img/billingIcon.svg';
import Inst from '../../assets/img/insta icon.svg';
import Facebook from '../../assets/img/fb icon.svg';
import Twitter from '../../assets/img/twitter icon.svg';
import Telegram from '../../assets/img/telegram icon 1.svg';
import Youtube from '../../assets/img/youtube icon 1.svg';
import BitcoinYayLogo from '../../assets/img/yay_03.svg';
import type {DrawerContentComponentProps} from '@react-navigation/drawer';

const socialLinks = [
  {component: <Facebook />, url: 'https://www.facebook.com/people/Bitcoin-YAY/61574910722200/'},
  {component: <Inst />, url: 'https://www.instagram.com/bitcoin.yay/'},
  {component: <Twitter />, url: 'https://x.com/bitcoin_YAY'},
  {component: <Telegram />, url: 'https://t.me/+pC3IVlPlwSEyODAx'},
  //{component: <Youtube />, url: 'https://youtube.com'},
];

const CustomDrawer: React.FC<DrawerContentComponentProps> = props => {
  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props}>
        <View style={styles.header}>
          <BitcoinYayLogo />
        </View>

        <View style={styles.menuItems}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'MiningTab',
                params: {screen: 'Mining'},
              })
            }>
            <Mine_yay />
            <Text style={styles.menuText}>Mine Bitcoin yay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'HomeTab',
                params: {screen: 'Mainnet'},
              })
            }>
            <Mainnet />
            <Text style={styles.menuText}>Mainnet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'RolesTab',
                params: {screen: 'Roles'},
              })
            }>
            <Roles />
            <Text style={styles.menuText}>Roles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'HomeTab',
                params: {screen: 'ChatStart'},
              })
            }>
            <Chat />
            <Text style={styles.menuText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'HomeTab',
                params: {screen: 'FAQs'},
              })
            }>
            <Faq />
            <Text style={styles.menuText}>FAQ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'HomeTab',
                params: {screen: 'WhitePaper'},
              })
            }>
            <Paper />
            <Text style={styles.menuText}>White Paper</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'SupportTab',
                params: {screen: 'Support'},
              })
            }>
            <Support />
            <Text style={styles.menuText}>Support Portal</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'HomeTab',
                params: {screen: 'CurrentSubscriptionDetail'},
              })
            }>
            <Billing />
            <Text style={styles.menuText}>Billing & Subscription</Text>
          </TouchableOpacity>  */}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'ProfileTab',
                params: {screen: 'Profile'},
              })
            }>
            <Profile />
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <Text style={styles.followText}>Follow Us On</Text>
        <View style={styles.socialIcons}>
          {socialLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => Linking.openURL(link.url)}
              style={styles.socialIcon}>
              {link.component}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.legalLinks}>
          <TouchableOpacity
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'ProfileTab',
                params: {screen: 'Privacy'},
              })
            }>
            <Text style={[styles.legalText, {color: colors.primary}]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              props.navigation.navigate('MainTabs', {
                screen: 'ProfileTab',
                params: {screen: 'Terms'},
              })
            }>
            <Text style={styles.legalText}>ToS</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.version}>v1.39.0(84/P)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    height: 40,
    resizeMode: 'contain',
  },
  menuItems: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuText: {
    color: colors.textPrimary,
    marginLeft: 15,
    fontSize: 16,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  followText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 10,
    fontWeight: 'regular',
    alignItems: 'center',
    textAlign: 'center',
  },
  socialIcons: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  socialIcon: {
    marginRight: 15,
  },
  legalLinks: {
    flexDirection: 'row',
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  legalText: {
    color: colors.primary,
    marginBottom: 12,
    fontSize: 14,
    marginTop: 10,
  },
  version: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default CustomDrawer;
