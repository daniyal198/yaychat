/**
 * YaysApp — Milestone 1 frontend.
 * Boots the self-contained YaysApp experience in src/yaychat/ backed by the
 * mock service layer. Legacy screens under src/screens are not mounted.
 */
import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppProviders} from './src/yaychat/state/AppProviders';
import {YayChatNavigation} from './src/yaychat/navigation';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppProviders>
        <YayChatNavigation />
      </AppProviders>
    </SafeAreaProvider>
  );
}

export default App;
