import {NativeModules} from 'react-native';

/** Audible cues used while YaysApp is in the foreground. */
export type NotificationSoundKind =
  | 'message'
  | 'community'
  | 'reward'
  | 'system'
  | 'call';

type NotificationSoundNativeModule = {
  play: (kind: NotificationSoundKind) => void;
};

let soundsEnabled = true;
const lastPlayedByEvent = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1800;

const nativeSound = (): NotificationSoundNativeModule | null => {
  const module = NativeModules?.NotificationSound as NotificationSoundNativeModule | undefined;
  return module?.play ? module : null;
};

/**
 * Foreground notifications do not make an OS sound, so play the bundled cue.
 * `eventId` prevents the same chat message sounding twice when it is observed
 * by both Firebase and the live chat socket.
 */
const play = (kind: NotificationSoundKind, eventId?: string) => {
  if (!soundsEnabled) {
    return;
  }
  const now = Date.now();
  if (eventId) {
    const key = `${kind}:${eventId}`;
    const previous = lastPlayedByEvent.get(key) ?? 0;
    if (now - previous < DEDUPE_WINDOW_MS) {
      return;
    }
    lastPlayedByEvent.set(key, now);
  }

  // Keep this map bounded during long-running chat sessions.
  if (lastPlayedByEvent.size > 100) {
    for (const [storedKey, playedAt] of lastPlayedByEvent) {
      if (now - playedAt > DEDUPE_WINDOW_MS) {
        lastPlayedByEvent.delete(storedKey);
      }
    }
  }

  try {
    nativeSound()?.play(kind);
  } catch {
    // Sound is an enhancement. A stale native build must not break delivery.
  }
};

export const notificationSoundService = {
  play,

  setEnabled(enabled: boolean) {
    soundsEnabled = enabled;
  },

  isEnabled(): boolean {
    return soundsEnabled;
  },

  /** Test seam. */
  reset() {
    soundsEnabled = true;
    lastPlayedByEvent.clear();
  },
};
