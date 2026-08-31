/**
 * Voice messages in chats and groups.
 *
 * Recording needs `react-native-audio-recorder-player`, a native module absent
 * from the test runner — the same state a build is in after `npm install` but
 * before a native rebuild. These tests pin the behaviour that matters there and
 * in the pure helpers around it: the mic must be *hidden* rather than offered
 * and then thrown from, and a recording must be uploaded as something playable.
 */
import {
  formatDuration,
  isVoiceNoteAvailable,
  mimeForRecording,
  resetAudioCache,
  startRecording,
  stopRecording,
  VoiceNoteStartError,
  VoiceNoteUnavailableError,
  VOICE_NOTE_MIME,
} from '../src/yaychat/services/voice/audio';

beforeEach(() => {
  resetAudioCache();
});

describe('voice note availability', () => {
  it('reports unavailable when the native module is not linked', () => {
    // The JS package resolves while the native side is missing. Trusting the
    // require alone would show a mic button that throws when held.
    expect(isVoiceNoteAvailable()).toBe(false);
  });

  it('refuses to start recording rather than failing silently', async () => {
    await expect(startRecording()).rejects.toBeInstanceOf(VoiceNoteUnavailableError);
  });

  it('treats stopping an absent recorder as a no-op', async () => {
    // Cleanup runs on unmount whether or not recording ever started; it must
    // not throw there and take the screen down with it.
    await expect(stopRecording()).resolves.toBeNull();
  });
});

describe('a microphone that never opens', () => {
  it('names the failure so the mic button cannot look merely dead', () => {
    // `startRecorder` stays pending rather than rejecting when the input
    // cannot be opened — another app holding the mic, a call in progress, a
    // simulator with no input device. Observed on the iOS simulator: the
    // composer kept showing the mic button with no recording bar and no error.
    const error = new VoiceNoteStartError();
    expect(error.name).toBe('VoiceNoteStartError');
    expect(error.message).toMatch(/microphone/i);
  });
});

describe('recording content type', () => {
  it('reads the container off the file the recorder produced', () => {
    // The recorder picks the container per platform — m4a on iOS, an mp4
    // container on Android. Signing the upload for the wrong type would leave
    // S3 serving something no player accepts.
    expect(mimeForRecording('file:///caches/sound.m4a')).toBe('audio/m4a');
    expect(mimeForRecording('/data/user/0/app/cache/sound.mp4')).toBe('audio/mp4');
  });

  it('ignores a query string on the uri', () => {
    expect(mimeForRecording('https://cdn.example/voice.m4a?sig=abc')).toBe('audio/m4a');
  });

  it('falls back to a sane audio type for an unknown extension', () => {
    expect(mimeForRecording('file:///caches/sound')).toBe(VOICE_NOTE_MIME);
    expect(mimeForRecording('file:///caches/sound.weird')).toBe(VOICE_NOTE_MIME);
  });
});

describe('duration label', () => {
  it('pads seconds so the label does not jitter in width', () => {
    expect(formatDuration(7)).toBe('0:07');
    expect(formatDuration(64)).toBe('1:04');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('never renders a negative or fractional length', () => {
    // Elapsed time is derived from a millisecond counter; rounding must not
    // produce "0:-1" or "0:3.5" on a bubble.
    expect(formatDuration(-3)).toBe('0:00');
    expect(formatDuration(2.7)).toBe('0:02');
  });
});
