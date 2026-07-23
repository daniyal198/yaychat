// components/OvalButton.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';

import OvalIcon from '../../assets/img/OvalIcon.svg'

interface OvalButtonProps {
  label?: string;
  textInsideOval?: string;
  IconInsideOval?: any; // require() or uri
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  isPng?: boolean;
  size?: 'small' | 'big';
}

const OvalButton: React.FC<OvalButtonProps> = ({
  label,
  textInsideOval,
  IconInsideOval,
  onPress,
  disabled,
  loading,
  isPng = false,
  size = 'small',
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={disabled || loading}>
      <View style={styles.oval}>
        <View style={styles.OvalContainer}>
          <OvalIcon style={{width: 100, height: 100}}/>
        </View>
        {loading ? (
          <ActivityIndicator
            color="#FFFFFF"
            size="small"
            style={styles.loader}
          />
        ) : IconInsideOval ? (
          isPng ? (
            <Image
              source={IconInsideOval}
              style={styles.icon}
              resizeMode="contain"
            />
          ) : (
            <IconInsideOval
              width={size === 'small' ? 30 : 50}
              height={size === 'small' ? 30 : 50}
              style={[styles.icon,]}
              resizeMode="contain"
            />
          )
        ) : (
          <Text style={styles.ovalText}>{textInsideOval}</Text>
        )}
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
};

export default OvalButton;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  oval: {
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{rotate: '-39deg'}],
    display: 'flex',
    flexDirection: 'row',
    position:'relative',
    height:80,
    width:100,
  },
  OvalContainer: {
    position:'absolute',
    transform: [{rotate: '39deg'}],
    width:100,
  },
  ovalText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    transform: [{rotate: '39deg'}],
  },
  icon: {
    width: 35,
    height: 35,
    tintColor: 'white',
    transform: [{rotate: '39deg'}],
  },
  loader: {
    transform: [{rotate: '39deg'}],
  },
  label: {
    marginTop: 20,
    color: '#868687',
    fontSize: 14,
  },
});
