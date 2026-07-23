import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {Svg, Line} from 'react-native-svg';
import Tick from '../../assets/splash/tick.svg';
import GreyStep from '../../assets/splash/grey.svg';
import {colors} from '../theme/colors';

import ActiveStep from '../../assets/img/active_step.png';
import InactiveStep from '../../assets/img/inactive_step.svg';

type StepProps = {
  index: number;
  activeStep: number;
  onPress?: () => void;
};

const steps = [
  {
    label: 'Pending Review',
    description: 'Request is submitted and awaiting approval.',
    activeImage: <Image source={ActiveStep} />,
    inactiveImage: <InactiveStep />,
  },
  {
    label: 'In Process',
    description: 'Request is being verified or processed.',
    activeImage: <Image source={ActiveStep} />,
    inactiveImage: <InactiveStep />,
  },
  {
    label: 'Approved',
    description: 'Subscription is activated successfully.',
    activeImage: <Image source={ActiveStep} />,
    inactiveImage: <InactiveStep />,
  },
  {
    label: 'Rejected',
    description: 'Subscription request was declined (with reason).',
    activeImage: <Image source={ActiveStep} />,
    inactiveImage: <InactiveStep />,
  },
];

type StepperProps = {
  orderId?: string;
  paymentType?: string;
  amount?: number;
  currency?: string;
};

const Stepper = ({orderId, paymentType, amount, currency}: StepperProps) => {
  const [activeStep, setActiveStep] = useState(0);

  const handleStepPress = (index: number) => {
    //setActiveStep(index);
  };

  useEffect(() => {
    console.log('Order Info:', {orderId, paymentType, amount, currency});
    // Optionally, use orderId to fetch status and setActiveStep accordingly
  }, [orderId]);

  return (
    <View style={styles.container}>
      {/* Vertical Line and Icons */}
      <View style={styles.stepperRow}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepIconContainer}>
            {index <= activeStep ? step.activeImage : step.inactiveImage}
            {index < steps.length - 1 && (
              <VerticalConnector index={index} activeStep={activeStep} />
            )}
          </View>
        ))}
      </View>

      {/* Steps */}
      <View style={styles.stepContainer}>
        {steps.map((step, index) => (
          <TouchableOpacity
            key={index}
            style={styles.stepItem}
            onPress={() => handleStepPress(index)}>
            <View style={styles.stepContent}>
              <Text
                style={[
                  styles.stepLabel,
                  index <= activeStep && styles.activeText,
                ]}>
                {step.label}
              </Text>
              <Text style={[styles.stepDescription]}>{step.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const VerticalConnector = ({index, activeStep}: StepProps) => (
  <View style={styles.connectorContainer}>
    <Svg height="100%" width="2">
      <Line
        x1="2"
        y1="0"
        x2="2"
        y2="100%"
        stroke={index < activeStep ? '#FF8728' : '#D1D5DB'}
        strokeWidth="1"
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary, // Use your primary button color
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    //color: '#FFF', // Use your button text color
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    marginTop: 50,
  },
  stepperRow: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 20,
    paddingTop: 8,
  },
  stepIconContainer: {
    alignItems: 'center',
    height: 125,
  },
  connectorContainer: {
    height: 80,
    alignItems: 'center',
  },
  stepContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 65,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    minHeight: 60,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepLabel: {
    fontSize: 16,
    color: '#D1D5DB',
    marginBottom: 4,
    fontWeight: 'semibold',
  },
  stepDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: 'regular',
  },
  activeText: {
    color: '#FF8728',
    fontWeight: 'bold',
  },
  activeDescription: {
    color: '#F59E0B',
  },
});

export default Stepper;
