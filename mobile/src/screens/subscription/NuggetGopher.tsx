import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import GopherNine from '../../../assets/splash/NineGopher.svg';
import RightArrow from '../../../assets/splash/arrow-right.svg';

const plans = [
  {
    title: 'Nugget Plan',
    iconText: 'mynaui_send',
    image: GopherNine,
    offText: 'Nugget Gophers are ready to work for you',
  },
];

const NuggetGopher = () => {
  const [index, _setIndex] = useState(0);
  return (
    <View style={styles.container}>
      {plans.map((plan, i) => (
        <View key={i} style={[styles.slide]}>
          <View style={styles.header}>
            <Text style={styles.text}>{plan.title}</Text>
            {index < plans.length - 1 && (
              <TouchableOpacity>
                <RightArrow />
              </TouchableOpacity>
            )}
          </View>

          <View style={{justifyContent: 'center', alignItems: 'center'}}>
            <plan.image />
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{plan.offText}</Text>
          </View>
        </View>
      ))}
      {/* Custom Pagination */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  slide: {
    width: '100%',
    marginHorizontal: 'auto',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  slideActiveBorder: {
    borderColor: '#D5D5D5',
  },
  header: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 15,
  },
  iconContainer: {
    height: 60,
    width: 60,
    backgroundColor: '#FF8728',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {fontSize: 24, fontWeight: 'bold', color: '#D5D5D5'},
  badgeContainer: {
    marginVertical: 20,
    justifyContent: 'center',

    alignItems: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  listContainer: {
    marginVertical: 20,
  },
  listItem: {flexDirection: 'row', alignItems: 'center', marginBottom: 20},
  listText: {color: '#fff', fontSize: 14},
  // Custom Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  bar: {
    width: 75,
    height: 7,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeBar: {backgroundColor: 'orange'},
  inactiveBar: {backgroundColor: 'gray'},
  buttonContainer: {
    width: '100%',
  },
});

export default NuggetGopher;
