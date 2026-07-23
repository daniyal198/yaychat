import React, {useEffect} from 'react';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import TabNavigator from './src/navigation/TabNavigator';
import {colors} from './src/theme/colors';
import {View, ActivityIndicator} from 'react-native';
import {AuthProvider, useAuth} from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import {UserRegistrationProvider} from './src/context/UserRegistrationContext';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {initIAPConnection} from './src/services/iap.service';
import {endIAPListeners, startIAPListeners} from './src/services/iapListeners';
import Config from 'react-native-config';

GoogleSignin.configure({
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true,
  forceCodeForRefreshToken: true,
  scopes: ['profile', 'email'],
});

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    primary: colors.primary,
    card: colors.cardBackground,
    text: colors.textPrimary,
    border: colors.border,
  },
};

function AppContent(): React.JSX.Element {
  const {isLoading, isLoggedIn} = useAuth();

  useEffect(() => {
    const initIAP = async () => {
      await initIAPConnection();
      startIAPListeners();
    };

    initIAP();

    return () => {
      endIAPListeners();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={MyTheme}>
      {isLoggedIn ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <UserRegistrationProvider>
        <AppContent />
      </UserRegistrationProvider>
    </AuthProvider>
  );
}

export default App;
