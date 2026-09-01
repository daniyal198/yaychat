/**
 * Voice-note recording and playback.
 *
 * `react-native-audio-recorder-player` is a native module: installing the JS
 * package proves nothing until the app has been rebuilt (`pod install` on iOS,
 * a Gradle sync on Android). This wrapper resolves it at runtime and treats its
 * absence as a first-class state, exactly as `calls/webrtc.ts` does — the
 * composer then hides the mic button instead of offering one that throws when
 * held.
 *
 * Everything above this file talks to the small surface below, so the recorder
 * UI never touches the native API directly.
 */
/** Recording progress tick, emitted roughly every 100ms while recording. */
export interface RecordProgress {
  /** Milliseconds recorded so far. */
  currentMs: number;
  /**
   * Current input level, 0–1, or undefined when the platform does not report
   * one. Drives the live waveform; the UI falls back to a flat bar without it.
   */
  level?: number;
}

/** Playback progress tick. */
export interface PlayProgress {
  currentMs: number;
  durationMs: number;
}

interface RecorderModule {
  startRecorder(uri?: string, audioSets?: Record<string, unknown>, meteringEnabled?: boolean): Promise<string>;
  stopRecorder(): Promise<string>;
  addRecordBackListener(cb: (e: any) => void): void;
  removeRecordBackListener(): void;
  startPlayer(uri?: string): Promise<string>;
  stopPlayer(): Promise<string>;
  pausePlayer(): Promise<string>;
  resumePlayer(): Promise<string>;
  seekToPlayer(ms: number): Promise<string>;
  addPlayBackListener(cb: (e: any) => void): void;
  removePlayBackListener(): void;
  setSubscriptionDuration(sec: number): Promise<string>;
}

let cached: RecorderModule | null | undefined;

/**
 * Is the native side actually linked?
 *
 * Mirrors the WebRTC check: after `npm install` but before a native rebuild the
 * JS resolves and the native module does not.
 */
const nativeModuleLinked = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {NativeModules} = require('react-native');
    return Boolean(NativeModules?.RNAudioRecorderPlayer);
  } catch {
    return false;
  }
};

/** The recorder, or null when this build does not have it. Memoised. */
export const recorder = (): RecorderModule | null => {
  if (cached !== undefined) {
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-audio-recorder-player');
    const instance = mod?.default ?? mod;
    // The package exports a class in some versions and a singleton in others.
    const resolved =
      typeof instance === 'function' ? new instance() : instance;
    if (!resolved?.startRecorder || !nativeModuleLinked()) {
      cached = null;
      return cached;
    }
    cached = resolved as RecorderModule;
  } catch {
    cached = null;
  }
  return cached;
};

export const isVoiceNoteAvailable = (): boolean => recorder() !== null;

/** Test hook — forgets the resolved module. */
export const resetAudioCache = () => {
  cached = undefined;
};

export class VoiceNoteUnavailableError extends Error {
  constructor() {
    super(
      'Voice messages are not available in this build. They need the audio native module, which arrives in the next app release.',
    );
    this.name = 'VoiceNoteUnavailableError';
  }
}

/**
 * Container for the recording.
 *
 * AAC in an .m4a container: it is the one format both platforms record and play
 * natively, and it is small enough that a minute of speech is a couple of
 * hundred kilobytes rather than several megabytes of WAV.
 */
export const VOICE_NOTE_EXTENSION = 'm4a';
export const VOICE_NOTE_MIME = 'audio/m4a';

/** Longest voice note the recorder will capture. Matches the server cap. */
export const MAX_VOICE_NOTE_SECONDS = 60 * 10;

/**
 * How long to wait for the recorder to actually start.
 *
 * `startRecorder` does not always reject when the microphone cannot be opened —
 * another app holding the input, a call in progress, a Bluetooth route change,
 * or a simulator with no input device all leave the promise pending forever.
 * Without this the composer sits on the mic button with no recording bar and no
 * error, which reads to the user as a dead button.
 */
const START_TIMEOUT_MS = 5000;

export class VoiceNoteStartError extends Error {
  constructor() {
    super('Could not start recording. Check that nothing else is using the microphone.');
    this.name = 'VoiceNoteStartError';
  }
}

/**
 * Encoder settings.
 *
 * Pinned rather than left to the platform defaults so both platforms produce
 * AAC in an MPEG-4 container: Android's default is AMR, which is speech-only,
 * noticeably worse, and not playable in most browsers if these files are ever
 * surfaced on the web. Mono at this quality keeps a minute of speech to a few
 * hundred kilobytes.
 *
 * The Android values are the platform's own MediaRecorder constants
 * (AudioSource.MIC, OutputFormat.MPEG_4, AudioEncoder.AAC).
 */
const AUDIO_SET = {
  AudioSourceAndroid: 1,
  OutputFormatAndroid: 2,
  AudioEncoderAndroid: 3,
  AVFormatIDKeyIOS: 'aac',
  AVNumberOfChannelsKeyIOS: 1,
  AVEncoderAudioQualityKeyIOS: 96,
};

/**
 * Content type for the file the recorder actually produced.
 *
 * The extension is read back off the returned URI rather than assumed: the
 * recorder picks the container, and signing an upload for the wrong type would
 * store a file S3 then serves with a content type nothing will play.
 */
export const mimeForRecording = (uri: string): string => {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (!extension) {
    return VOICE_NOTE_MIME;
  }
  if (extension === 'mp4' || extension === 'm4a' || extension === 'aac') {
    return `audio/${extension}`;
  }
  return VOICE_NOTE_MIME;
};

/**
 * Start recording.
 *
 * Resolves to the file URI being written. `onProgress` fires about ten times a
 * second so the UI can show elapsed time and a live level.
 */
export const startRecording = async (
  onProgress?: (progress: RecordProgress) => void,
): Promise<string> => {
  const engine = recorder();
  if (!engine) {
    throw new VoiceNoteUnavailableError();
  }
  engine.setSubscriptionDuration(0.1);
  // `metering` gives the input level; it is ignored on platforms without it.
  // No path is passed: the recorder writes to its own cache location and
  // returns the URI, which is the only reliable source of the real extension.
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let uri: string;
  try {
    uri = await Promise.race([
      engine.startRecorder(undefined, AUDIO_SET, true),
      new Promise<never>((_, reject) => {
        startTimer = setTimeout(() => reject(new VoiceNoteStartError()), START_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    // Leave the engine idle, or the next press starts on top of a half-open
    // session that never produced audio.
    try {
      await engine.stopRecorder();
      engine.removeRecordBackListener();
    } catch {}
    throw error instanceof VoiceNoteStartError ? error : new VoiceNoteStartError();
  } finally {
    if (startTimer) {
      clearTimeout(startTimer);
    }
  }
  engine.addRecordBackListener((event: any) => {
    const currentMs = Number(event?.currentPosition ?? 0);
    // Metering is reported in dBFS (negative, 0 is loudest). Map to 0–1 so the
    // UI does not have to know about decibels.
    const db = Number(event?.currentMetering);
    const level = Number.isFinite(db)
      ? Math.max(0, Math.min(1, (db + 60) / 60))
      : undefined;
    onProgress?.({currentMs, level});
  });
  return uri;
};

/** Stop recording and return the finished file URI. */
export const stopRecording = async (): Promise<string | null> => {
  const engine = recorder();
  if (!engine) {
    return null;
  }
  try {
    const uri = await engine.stopRecorder();
    engine.removeRecordBackListener();
    return uri && uri !== 'Already stopped' ? uri : null;
  } catch {
    // A stop that fails still has to leave the recorder idle, or the next
    // press would start on top of a live session.
    try {
      engine.removeRecordBackListener();
    } catch {}
    return null;
  }
};

/** Start playing a voice note. `onProgress` drives the scrubber. */
export const startPlayback = async (
  uri: string,
  onProgress?: (progress: PlayProgress) => void,
  onFinished?: () => void,
): Promise<void> => {
  const engine = recorder();
  if (!engine) {
    throw new VoiceNoteUnavailableError();
  }
  engine.setSubscriptionDuration(0.1);
  await engine.startPlayer(uri);
  engine.addPlayBackListener((event: any) => {
    const currentMs = Number(event?.currentPosition ?? 0);
    const durationMs = Number(event?.duration ?? 0);
    onProgress?.({currentMs, durationMs});
    // The listener is the only signal that playback ran to the end.
    if (durationMs > 0 && currentMs >= durationMs) {
      onFinished?.();
    }
  });
};

export const stopPlayback = async (): Promise<void> => {
  const engine = recorder();
  if (!engine) {
    return;
  }
  try {
    await engine.stopPlayer();
    engine.removePlayBackListener();
  } catch {
    try {
      engine.removePlayBackListener();
    } catch {}
  }
};

export const pausePlayback = async (): Promise<void> => {
  const engine = recorder();
  if (!engine) {
    return;
  }
  try {
    await engine.pausePlayer();
  } catch {}
};

export const resumePlayback = async (): Promise<void> => {
  const engine = recorder();
  if (!engine) {
    return;
  }
  try {
    await engine.resumePlayer();
  } catch {}
};

/** `0:07`, `1:04` — the label shown on a voice bubble. */
export const formatDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};
