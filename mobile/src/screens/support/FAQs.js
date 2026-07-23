import React, {useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Collapsible from 'react-native-collapsible';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FAQsScreen = () => {
  const [activeSections, setActiveSections] = useState([]);

  const toggleSection = index => {
    if (activeSections.includes(index)) {
      setActiveSections(activeSections.filter(i => i !== index));
    } else {
      setActiveSections([...activeSections, index]);
    }
  };

  const faqs = [
    {
      question: 'What is Bitcoin yay Network?',
      answer:
        'Bitcoin yay Network is a decentralized network for mining and distributing Bitcoin yay.',
    },
    {
      question: 'Who created Bitcoin yay Network?',
      answer:
        'Bitcoin yay Network was created by an anonymous developer or group of developers.',
    },
    {
      question: 'How does Bitcoin yay Network work?',
      answer:
        'Bitcoin yay Network works by allowing users to mine Bitcoin yay through a simple app interface.',
    },
    {
      question: 'How can I mine Bitcoin yay?',
      answer:
        'You can mine Bitcoin yay by downloading the Bitcoin yay Network app, signing up, and pressing the mining button once every 24 hours. No special hardware is required.',
    },
    {
      question: 'Can I mine Bitcoin yay on multiple devices?',
      answer:
        'No, each person is allowed only one account to ensure fair distribution. Multiple accounts may lead to bans.',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>FAQ's</Text>
      <View style={styles.bgImg}>
        <Image
          style={styles.logo}
          source={require('../../../assets/img/yey_outline.png')}
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
            <View style={{maxWidth: 280, width: '100%'}}>
              <Text style={styles.question}>{faq.question}</Text>
            </View>
            <View style={{width: 10}}>
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
          </TouchableOpacity>

          <Collapsible collapsed={!activeSections.includes(index)}>
            <Text style={styles.answer}>{faq.answer}</Text>
          </Collapsible>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },
  bgImg: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#D5D5D5',
    marginTop: 80,
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
});

export default FAQsScreen;
