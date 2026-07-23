import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import imageOne from '../../assets/img/image_1.png';
import imageTwo from '../../assets/img/image_2.png';
import imageThird from '../../assets/img/image_3.png';
import imageFour from '../../assets/img/image_4.png';
 
// Reusable Header Component
const Header = ({username, timestamp}) => (
  <View style={styles.headerContainer}>
    <Text style={styles.sectionSubTitle}>{username}</Text>
    <Text style={styles.sectionSubTitle}>{timestamp}</Text>
  </View>
);

// Reusable Footer Component
const Footer = ({likes, views}) => (
  <View style={styles.footer}>
    <View style={styles.spacer} />
    <Image style={styles.icon} source={require('../../assets/img/token.png')} />
    <Text style={styles.views}>{views}</Text>
  </View>
);

// Reusable PostCard Component
const PostCard = ({imageSource, username, timestamp, content, category}) => (
  <View style={styles.sectionContainerBg}>
    <Header username={username} timestamp={timestamp} />
    {category && <Text style={styles.categoryText}>{category}</Text>}
    <View style={styles.sectionWithBg}>
      <Image source={imageSource} style={{width: '100%'}} />
    </View>
    <Text style={styles.sectionDescription}>{content}</Text>
    <Footer likes="1258" views="2548" />
  </View>
);

const postData = [
  {
    username: '@Sam',
    timestamp: 'Feb 21st - 1:23pm',
    imageSource: imageOne,
    content:
      'Mining Bitcoin-YAY is surprisingly simple — no tech headaches, just tap and go. Love how smooth it runs!',
  },
  {
    username: '@William',
    timestamp: 'Feb 21st - 1:23pm',
    imageSource: imageTwo,
    content:
      'The platform is clean, fast, and user-friendly. Mining doesn’t feel like a chore — it’s actually fun!',
  },
  {
    username: '@nicole88',
    timestamp: 'Feb 21st - 1:23pm',
    imageSource: imageThird,
    content:
      'I’m impressed by how beginner-friendly Bitcoin-YAY is. Fast setup, no confusion — just results.',
  },
  {
    username: '@TONY P.',
    timestamp: 'Feb 21st - 1:23pm',
    imageSource: imageFour,
    content:
      'This platform is truly streamlined. It gets straight to the point — fast mining, easy interface, zero stress.',
  },
 
];
const HomeScreen = () => {
  return (
    <ScrollView style={styles.container}>
      {/* <PostCard
        imageSource={require('../../assets/img/yay_03.png')}
        username="@Bitcoin yay Team"
        timestamp="Feb 21st - 1:23pm"
        content="Gopher, Open Network has launched! This means that external connectivity of Bitcoin yay is now available for the Bitcoin yay Community around the world..."
      /> */}

      <View style={styles.gopherSection}>
        <Ionicons name="help-circle-outline" size={22} color={'#FF8728'} />
        <Text style={styles.gopherTitle}>Gopher Post</Text>
      </View>

      {postData.map(curr => (
        <PostCard
          key={curr.username}
          imageSource={curr.imageSource}
          username={curr.username}
          timestamp={curr.timestamp}
          category=""
          content={curr.content}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    width: '100%',
    marginBottom: 8,
  },
  sectionContainerBg: {
    padding: 16,
    marginBottom: 24,
  },
  sectionWithBg: {
    alignItems: 'center',
    marginVertical: 14,
    overflow: 'hidden',
  },
  sectionSubTitle: {
    fontSize: 14,
    color: '#d5d5d5',
  },
  sectionDescription: {
    fontSize: 12,
    color: '#d5d5d5',
    lineHeight: 20,
  },
  categoryText: {
    color: '#FF8728',
    textAlign: 'center',
    borderRadius: 10,
    padding: 5,
    marginVertical: 5,
    alignSelf: 'flex-start',
  },
  gopherSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 25,
  },
  gopherTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8728',
  },
  button: {
    backgroundColor: '#FF8728',
    borderRadius: 8,
    padding: 8,
  },
  likes: {
    color: 'white',
    fontSize: 16,
    marginHorizontal: 10,
    fontWeight: 'bold',
    borderRadius: 5,
    borderWidth: 1,
    padding: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  spacer: {
    flex: 1,
  },
  views: {
    color: 'white',
    marginLeft: 5,
  },
  icon: {
    width: 20,
    height: 20,
  },
});

export default HomeScreen;
