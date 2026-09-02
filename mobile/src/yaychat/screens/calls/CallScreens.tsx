/**
 * Call screens — the in-call surface, the incoming-call sheet, and history.
 *
 * These render `CallState` and nothing else: every transition, timer, and
 * teardown lives in `callService`, so a screen unmounting mid-call (a
 * background, a navigation race) cannot strand the microphone or leave the peer
 * looking at a call that has already ended on this side.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AsyncView,
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Divider,
  ListRow,
  Row,
  Screen,
  Spacer,
  StateView,
  YayText,
} from '../../design/components';
import {colors, radius, spacing} from '../../design/tokens';
import {callService} from '../../services/calls/callService';
import type {CallState} from '../../services/calls/callService';
import {rtc} from '../../services/calls/webrtc';
import {callHistoryService} from '../../services/calls/callHistory';
import type {CallHistoryEntry} from '../../services/calls/callHistory';
import {useAsync} from '../../state/hooks';
import {useToast} from '../../state/AppProviders';
import type {RootStackParamList} from '../../types/navigation';

// ---------------------------------------------------------------------------
// Shared hook
// ---------------------------------------------------------------------------

/** Subscribe to the call state machine. */
export const useCallState = (): CallState => {
  const [state, setState] = useState<CallState>(() => callService.current());
  useEffect(() => callService.subscribe(setState), []);
  return state;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const hours = Math.floor(mins / 60);
  const body = `${String(mins % 60).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${body}` : body;
};

const PHASE_LABEL: Record<CallState['phase'], string> = {
  idle: '',
  dialing: 'Calling…',
  ringing: 'Incoming call',
  connecting: 'Connecting…',
  connected: '',
  ended: 'Call ended',
};

const END_REASON_LABEL: Record<string, string> = {
  hangup: 'Call ended',
  declined: 'Call declined',
  no_answer: 'No answer',
  caller_cancelled: 'Call cancelled',
  busy: 'They are on another call',
  connection_failed: 'Could not connect',
  unsupported_client: 'Calling is not available on their app version',
  handled_elsewhere: 'Answered on another device',
};

// ---------------------------------------------------------------------------
// Video surface
// ---------------------------------------------------------------------------

/**
 * Renders a WebRTC stream.
 *
 * `RTCView` only exists when the native module is installed. Falling back to a
 * plain placeholder means the screen still lays out correctly in builds — and
 * in tests — without it.
 */
const StreamView = ({
  stream,
  mirror,
  style,
}: {
  stream: any;
  mirror?: boolean;
  style?: any;
}) => {
  const engine = rtc();
  const RTCView = engine?.RTCView;
  if (!RTCView || !stream?.toURL) {
    return <View style={[styles.streamFallback, style]} />;
  }
  return (
    <RTCView
      streamURL={stream.toURL()}
      objectFit="cover"
      mirror={mirror}
      style={[styles.stream, style]}
    />
  );
};

// ---------------------------------------------------------------------------
// Active call
// ---------------------------------------------------------------------------

export const ActiveCallScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'ActiveCall'>) => {
  const call = useCallState();
  const toast = useToast();

  // The state machine, not the screen, decides when a call is over — this only
  // returns the user to where they were once it is.
  useEffect(() => {
    if (call.phase === 'idle') {
      navigation.canGoBack() && navigation.goBack();
    }
  }, [call.phase, navigation]);

  const dismiss = useCallback(() => {
    callService.clear();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  if (call.phase === 'idle') {
    return (
      <Screen scroll={false}>
        <StateView
          icon="call-outline"
          title="No active call"
          message="This call has already ended."
          actionLabel="Go back"
          onAction={dismiss}
        />
      </Screen>
    );
  }

  const isVideo = call.media === 'video';
  const showRemoteVideo = isVideo && call.phase === 'connected' && call.remoteStream;

  return (
    <Screen scroll={false} style={styles.callScreen}>
      {showRemoteVideo ? (
        <StreamView stream={call.remoteStream} style={StyleSheet.absoluteFill} />
      ) : null}

      <View style={styles.callHeader}>
        <Avatar name={call.peerName ?? '?'} size={96} />
        <Spacer size={spacing.md} />
        <YayText variant="title" color={showRemoteVideo ? colors.textOnBrand : undefined}>
          {call.peerName ?? 'Unknown'}
        </YayText>
        <YayText
          variant="caption"
          color={showRemoteVideo ? colors.textOnBrand : colors.textMuted}>
          {call.phase === 'connected'
            ? formatDuration(call.durationSeconds)
            : call.phase === 'ended'
            ? END_REASON_LABEL[call.endReason ?? 'hangup'] ?? 'Call ended'
            : PHASE_LABEL[call.phase]}
        </YayText>
      </View>

      {isVideo && call.localStream && call.phase !== 'ended' ? (
        <View style={styles.selfView}>
          <StreamView stream={call.localStream} mirror />
        </View>
      ) : null}

      <View style={styles.callControls}>
        {call.phase === 'ended' ? (
          <Button label="Done" icon="checkmark" onPress={dismiss} />
        ) : (
          <>
            <Row gap={spacing.md} style={styles.controlRow}>
              <CallControl
                icon={call.muted ? 'mic-off' : 'mic'}
                label={call.muted ? 'Unmute' : 'Mute'}
                active={call.muted}
                onPress={() => callService.toggleMute()}
              />
              <CallControl
                icon={call.speakerOn ? 'volume-high' : 'volume-medium'}
                label="Speaker"
                active={call.speakerOn}
                onPress={() => callService.toggleSpeaker()}
              />
              {isVideo ? (
                <>
                  <CallControl
                    icon={call.cameraOff ? 'videocam-off' : 'videocam'}
                    label={call.cameraOff ? 'Camera on' : 'Camera off'}
                    active={call.cameraOff}
                    onPress={() => callService.toggleCamera()}
                  />
                  <CallControl
                    icon="camera-reverse"
                    label="Flip camera"
                    onPress={() => callService.switchCamera()}
                  />
                </>
              ) : null}
            </Row>
            <Spacer size={spacing.lg} />
            <Row style={styles.controlRow}>
              <CallActionButton
                icon="call"
                label="End call"
                tone="decline"
                onPress={() => {
                  callService.hangUp().catch(() => toast.show('Could not end the call', 'error'));
                }}
              />
            </Row>
          </>
        )}
      </View>
    </Screen>
  );
};

const CallControl = ({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <View style={styles.controlItem}>
    {/* Pressable rather than onTouchEnd: the raw touch handler fires even when
        the gesture started elsewhere and slid onto the button, and gives no
        press feedback — on a call screen that means muting yourself by
        accident with no sign it happened. */}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected: !!active}}
      hitSlop={8}
      onPress={onPress}
      style={({pressed}) => [
        styles.controlCircle,
        active && styles.controlCircleActive,
        pressed && {opacity: 0.6},
      ]}>
      <Ionicons
        name={icon}
        size={30}
        color={active ? colors.textOnBrand : colors.textPrimary}
      />
    </Pressable>
    <YayText variant="micro" color={colors.textMuted}>
      {label}
    </YayText>
  </View>
);

/**
 * The big round answer / decline / hang-up buttons.
 *
 * Sized for a phone held at arm's length in a hurry: these are the controls
 * people reach for without looking, and the previous text buttons were the
 * same size as everything else on the screen.
 */
const CallActionButton = ({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: string;
  label: string;
  tone: 'accept' | 'decline';
  onPress: () => void;
}) => (
  <View style={styles.controlItem}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({pressed}) => [
        styles.actionCircle,
        {backgroundColor: tone === 'accept' ? colors.success : colors.danger},
        pressed && {opacity: 0.75},
      ]}>
      <Ionicons
        name={icon}
        size={36}
        color={colors.textOnBrand}
        // A declined/ended call is the same handset icon rotated, which is the
        // convention every phone uses.
        style={tone === 'decline' ? {transform: [{rotate: '135deg'}]} : undefined}
      />
    </Pressable>
    <YayText variant="micro" color={colors.textMuted}>
      {label}
    </YayText>
  </View>
);

// ---------------------------------------------------------------------------
// Incoming call
// ---------------------------------------------------------------------------

export const IncomingCallScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'IncomingCall'>) => {
  const call = useCallState();
  const toast = useToast();

  useEffect(() => {
    // The moment the call is answered here or elsewhere, this screen is done:
    // either it becomes the active call, or the ring is over.
    if (call.phase === 'connecting' || call.phase === 'connected') {
      navigation.replace('ActiveCall');
    } else if (call.phase === 'idle') {
      navigation.canGoBack() && navigation.goBack();
    }
  }, [call.phase, navigation]);

  if (call.phase === 'ended') {
    return (
      <Screen scroll={false}>
        <StateView
          icon="call-outline"
          title={END_REASON_LABEL[call.endReason ?? 'hangup'] ?? 'Call ended'}
          message={call.peerName ? `From ${call.peerName}` : undefined}
          actionLabel="Close"
          onAction={() => {
            callService.clear();
            navigation.canGoBack() && navigation.goBack();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={styles.callScreen}>
      <View style={styles.callHeader}>
        <Avatar name={call.peerName ?? '?'} size={112} />
        <Spacer size={spacing.md} />
        <YayText variant="title">{call.peerName ?? 'Unknown'}</YayText>
        <YayText variant="caption" color={colors.textMuted}>
          {call.media === 'video' ? 'Incoming video call' : 'Incoming call'}
        </YayText>
      </View>

      <View style={styles.callControls}>
        <Row gap={spacing.xl} style={styles.controlRow}>
          <CallActionButton
            icon="call"
            label="Decline"
            tone="decline"
            onPress={() => {
              callService.decline().catch(() => {});
            }}
          />
          <CallActionButton
            icon="call"
            label="Accept"
            tone="accept"
            onPress={() => {
              callService.accept().catch((e: any) => toast.show(e?.message ?? 'Could not answer', 'error'));
            }}
          />
        </Row>
      </View>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Call history
// ---------------------------------------------------------------------------

const historyIcon = (entry: CallHistoryEntry): string =>
  entry.media === 'video'
    ? 'videocam'
    : entry.missed
    ? 'call-outline'
    : entry.direction === 'outgoing'
    ? 'arrow-up-circle-outline'
    : 'arrow-down-circle-outline';

const historySubtitle = (entry: CallHistoryEntry): string => {
  if (entry.missed) {
    return 'Missed';
  }
  if (entry.status === 'declined') {
    return 'Declined';
  }
  if (entry.status === 'cancelled') {
    return 'Cancelled';
  }
  if (entry.status === 'failed') {
    return 'Failed to connect';
  }
  return entry.durationSeconds > 0 ? formatDuration(entry.durationSeconds) : 'No answer';
};

export const CallHistoryScreen = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'CallHistory'>) => {
  const [capability, setCapability] = useState<{available: boolean; reason: string | null} | null>(
    null,
  );
  const {data, loading, error, offline, reload, refreshing, refresh} = useAsync(
    () => callHistoryService.list(),
    [],
  );

  useEffect(() => {
    callService
      .capabilities()
      .then(c => setCapability({available: c.available, reason: c.reason}))
      .catch(() => setCapability({available: false, reason: 'Calling is unavailable.'}));
  }, []);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {capability && !capability.available ? (
        <Banner tone="warning" icon="information-circle" text={capability.reason ?? ''} />
      ) : null}
      <AsyncView
        loading={loading}
        error={error}
        offline={offline}
        onRetry={reload}
        data={data}
        isEmpty={data != null && data.length === 0}
        emptyTitle="No calls yet"
        emptyMessage="Voice and video calls you make or receive appear here.">
        {entries => (
          <Card style={{paddingVertical: spacing.xxs}}>
            {entries.map((entry, i) => (
              <View key={entry.callId}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  icon={historyIcon(entry)}
                  title={entry.peerName}
                  subtitle={historySubtitle(entry)}
                  chevron={false}
                  right={
                    entry.missed ? <Badge label="Missed" tone="danger" /> : undefined
                  }
                  onPress={() =>
                    navigation.navigate('Main', {
                      screen: 'ChatsTab',
                      params: {
                        screen: 'Conversation',
                        params: {conversationId: `dm:${entry.peer}`},
                      },
                    })
                  }
                />
              </View>
            ))}
          </Card>
        )}
      </AsyncView>
    </Screen>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  callScreen: {
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
  },
  callHeader: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  callControls: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  controlRow: {
    justifyContent: 'center',
  },
  controlItem: {
    alignItems: 'center',
    gap: spacing.xxs,
  },
  controlCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlCircleActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  actionCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stream: {
    flex: 1,
  },
  streamFallback: {
    flex: 1,
    backgroundColor: colors.surfaceSunken,
  },
  selfView: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    width: 108,
    height: 152,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
  },
});
