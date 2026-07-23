import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import React from 'react';
import {View, Text, StyleSheet, Image} from 'react-native';
import Button from '../../components/button';

//import {RootStackParamsList} from '../../RootNavigator';

// type StartScreenNavigationProp = StackNavigationProp<
//   RootStackParamsList,
//   'Home'
// >;

const StartMiningScreen = () => {
  const navigation = useNavigation();

  const miningStart = false;
  return (
    <View style={styles.container}>
      <View style={styles.bgImg}>
        <Image
          style={styles.logo}
          source={require('../../../assets/img/yey_outline.png')}
        />
      </View>
      <Image
        style={styles.logo}
        source={require('../../../assets/img/yay_03.png')}
      />
      <View style={styles.row}>
        <Text style={styles.miningText1}>
          0.
          <Text style={styles.balance}>03658</Text>
        </Text>
        <Image
          style={styles.logo}
          source={require('../../../assets/img/yayB1.png')}
        />
      </View>
      <Text style={styles.balance}></Text>
      <Image
        style={styles.logo}
        source={
          !miningStart
            ? require('../../../assets/img/gopher.png')
            : require('../../../assets/img/cartwithcoins.png')
        }
      />
      <Text style={styles.miningText}>
        <Text
          style={{
            color: '#B7B7B7',
            fontSize: 30,
            fontWeight: 500,
            marginBottom: 30,
            // fontFamily: 'poppins',
          }}>
          {miningStart ? '23:45:25' : '0:00:00'}
        </Text>
      </Text>
      <Button
        title={miningStart ? 'View Mining Details' : 'Start Mining'}
        onPress={() =>
          miningStart
            ? navigation.navigate('MiningDetails')
            : navigation.navigate('StartMining')
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15, // Prevents buttons from touching screen edges
    width: '100%',
    position: 'relative',
  },
  bgImg: {
    position: 'absolute',
    bottom: -50,
    right: -50,
  },
  logo: {
    //width: 45,
    // height: 45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balance: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#b7b7b7',
    // marginBottom: 10,
  },
  miningText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '400',
    marginBottom: 40,
  },
  miningText1: {
    fontSize: 56,
    color: '#b7b7b7',
    fontWeight: '400',
  },
  subtitle: {
    color: '#FFF',
    marginTop: 10,
    marginBottom: 50,
    fontSize: 22,
    maxWidth: 250,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%', // Ensures the container is full width
  },
  button: {
    backgroundColor: '#F88D39',
    padding: 15,
    width: '100%', // Ensures button takes full width of parent container
    borderRadius: 5,
    alignItems: 'center',

    marginVertical: 20,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'regular',
    fontSize: 17,
  },
});

export default StartMiningScreen;
