/** Shared/global-state screens: coming soon, splash, and status helpers. */
import React from 'react';
import {View} from 'react-native';
import {BrandMark, Screen, StateView, YayText} from '../../design/components';
import {colors, spacing} from '../../design/tokens';

export const ComingSoonScreen = ({route}: any) => (
  <Screen scroll={false}>
    <StateView
      icon="rocket-outline"
      title={route?.params?.title ?? 'Coming soon'}
      message={
        route?.params?.message ??
        'This part of YaysApp is on the roadmap and will unlock in a future milestone.'
      }
    />
  </Screen>
);

export const SplashView = () => (
  <View
    style={{
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    }}>
    <BrandMark size={120} />
    <YayText variant="title">YaysApp</YayText>
    <YayText variant="caption" color={colors.textMuted}>
      Chat. Learn. Earn. Together.
    </YayText>
  </View>
);
