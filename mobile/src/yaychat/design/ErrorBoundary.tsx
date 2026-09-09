/**
 * Screen-level error boundary (BUG-008).
 *
 * React Native has no default for a throw during render: the exception reaches
 * the native host and terminates the process, which is what turned a malformed
 * settings payload into an app crash rather than a broken screen. Wrapping a
 * screen in one of these turns that into something the user can back out of.
 */
import React from 'react';
import {View} from 'react-native';
import {Button, Card, Screen, Spacer, YayText} from './components';
import {colors, spacing} from './tokens';
import {analytics} from '../services';

interface Props {
  children: React.ReactNode;
  /** Named in the crash report so the screen is identifiable in telemetry. */
  screen: string;
  onRetry?: () => void;
}

interface State {
  error: Error | null;
}

export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error) {
    // Reported rather than swallowed: a screen that fails for everyone should
    // be visible in telemetry even though the user now has a way out.
    analytics.track?.('screen_render_error', {
      screen: this.props.screen,
      message: String(error?.message || error),
    });
  }

  private retry = () => {
    this.setState({error: null});
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <Screen>
        <Spacer size={spacing.xl} />
        <Card>
          <View style={{alignItems: 'center'}}>
            <YayText variant="title">This screen could not load</YayText>
            <Spacer size={spacing.xs} />
            <YayText variant="caption" color={colors.textMuted} style={{textAlign: 'center'}}>
              Something went wrong reading your settings. Your data is safe — go back and try
              again.
            </YayText>
            <Spacer size={spacing.md} />
            <Button label="Try again" icon="refresh" onPress={this.retry} />
          </View>
        </Card>
      </Screen>
    );
  }
}
