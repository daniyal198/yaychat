import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors } from '../../../theme/colors';
import PasswordTextField from '../../../components/PasswordTextField';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AuthNavigationProp } from '../../../navigation/types';
import Button from '../../../components/Button';
import { useAuth } from '../../../context/AuthContext';
import { RootStackParamsList } from '../../../RootNavigator';
import { loginWithPhone } from '../../../services/auth.service';
import OvalButton from '../../../components/OvalButton';
type RouteProps = RouteProp<RootStackParamsList, 'LoginWithPhonePassword'>;
const LoginWithPhonePassword = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const navigationHome = useNavigation();

  const route = useRoute<RouteProps>();
  const { phone } = route.params;
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    setIsLoading(true);
    if (password.length >= 8) {
      try {
        const res = await loginWithPhone(phone, password);
        console.log('Login response:', res);
        if (res?.data?.access_token) {
          setIsLoading(false);
          await login(res?.data?.access_token);
          navigation.navigate('Home');
        } else {
          setIsLoading(false);
          Alert.alert('Login Failed', res.message || 'Invalid credentials');
        }
      } catch (error) {
        setIsLoading(false);
        console.error('Login error:', error);
        Alert.alert('Error', 'Something went wrong');
      } 
    } else {
      setIsLoading(false);
      Alert.alert(
        'Invalid Password',
        'Password must be at least 8 characters.',
      );
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('LoginWithPhoneForgetPassword' as any); // TypeScript workaround or fix your type list
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <Text style={styles.title}>Your Password</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Password</Text>
            <PasswordTextField
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
            />
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <OvalButton
            textInsideOval="Submit"
            onPress={handleSubmit}
            disabled={isLoading}
            loading={isLoading}
          />
          {/* 
          <Button
            title="Submit"
            onPress={handleSubmit}
            disabled={isLoading}
            loading={isLoading}
          /> */}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 32,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  forgotPassword: {
    color: colors.primary,
    fontSize: 14,
    textAlign: 'right',
    marginTop: 8,
  },
});

export default LoginWithPhonePassword;
