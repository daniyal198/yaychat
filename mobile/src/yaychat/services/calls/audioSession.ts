/**
 * Call audio: routing, ringtone, ringback, and the end-of-call tone.
 *
 * WebRTC gives you a media stream, not a phone. Everything that makes a call
 * *feel* like a call — which speaker the audio comes out of, the ringing you
 * hear while it connects, the buzz when someone calls you, the screen going
 * dark against your ear — is the platform's audio session, and none of it
 * happens on its own.
 *
 * `react-native-incall-manager` owns that session. It is a native module, so
 * it is resolved at call time and its absence is a first-class state, exactly
 * as `webrtc.ts` and `voice/audio.ts` do: a build without it still places
 * calls, just without routing or tones.
 */

let cached: any | null | undefined;

const nativeModuleLinked = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {NativeModules} = require('react-native');
    return Boolean(NativeModules?.InCallManager);
  } catch {
    return false;
  }
};

const manager = (): any | null => {
  if (cached !== undefined) {
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-incall-manager');
    const resolved = mod?.default ?? mod;
    if (!resolved?.start || !nativeModuleLinked()) {
      cached = null;
      return cached;
    }
    cached = resolved;
  } catch {
    cached = null;
  }
  return cached;
};

export const isCallAudioAvailable = (): boolean => manager() !== null;

/** Test seam. */
export const resetCallAudioCache = () => {
  cached = undefined;
};

/**
 * Take over the audio session for an outgoing call and play ringback.
 *
 * Ringback is the tone *the caller* hears while the other phone rings. Without
 * it a placed call is silent, which reads as a call that failed to go through.
 */
export const startOutgoingAudio = (media: 'audio' | 'video') => {
  const engine = manager();
  if (!engine) {
    return;
  }
  try {
    engine.start({media, auto: true, ringback: '_DTMF_'});
    engine.setKeepScreenOn?.(true);
  } catch {}
};

/**
 * Ring for an incoming call.
 *
 * The vibration pattern is part of this: a call that arrives on a silenced
 * phone with no buzz is a call that gets missed.
 */
export const startIncomingRinging = () => {
  const engine = manager();
  if (!engine) {
    return;
  }
  try {
    // '_DEFAULT_' uses the system ringtone; the second argument is the
    // vibration pattern, and the last is a seconds cap so a ring can never
    // outlive the call it belongs to.
    engine.startRingtone('_DEFAULT_', [0, 1000, 800], 'playback', 60);
    engine.setKeepScreenOn?.(true);
  } catch {}
};

/**
 * Media is flowing — stop the ringing and settle into in-call audio.
 *
 * Called on both sides at connect: the caller stops ringback, the callee stops
 * the ringtone, and both hand the session to the call itself.
 */
export const startInCallAudio = (media: 'audio' | 'video', speakerOn: boolean) => {
  const engine = manager();
  if (!engine) {
    return;
  }
  try {
    engine.stopRingtone?.();
    engine.stopRingback?.();
    engine.start({media, auto: false});
    setSpeaker(speakerOn);
  } catch {}
};

/**
 * Route audio to the loudspeaker or back to the earpiece.
 *
 * `setForceSpeakerphoneOn` is the one that actually moves the route — the
 * plain `speakerOn` flag the UI keeps is only a label until this runs.
 */
export const setSpeaker = (on: boolean) => {
  const engine = manager();
  if (!engine) {
    return;
  }
  try {
    engine.setForceSpeakerphoneOn(on);
    engine.setSpeakerphoneOn?.(on);
  } catch {}
};

/** Mute/unmute at the session level, alongside disabling the track. */
export const setMicrophoneMuted = (muted: boolean) => {
  const engine = manager();
  if (!engine) {
    return;
  }
  try {
    engine.setMicrophoneMute?.(muted);
  } catch {}
};

/**
 * Release the session and play the end tone.
 *
 * `busytone` is what tells the user the call is over without them having to
 * read the screen. It is skipped for a call that simply ended normally after
 * connecting — that gets silence, the way a phone does.
 */
export const stopCallAudio = (playBusyTone: boolean) => {
  const engine = manager();
  if (!engine) {
    return;
  }
  try {
    engine.stopRingtone?.();
    engine.stopRingback?.();
    engine.stop(playBusyTone ? {busytone: '_DTMF_'} : {});
    engine.setKeepScreenOn?.(false);
    engine.setForceSpeakerphoneOn(null);
  } catch {}
};
