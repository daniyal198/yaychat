/**
 * Call audio: routing and tones.
 *
 * WebRTC gives you a media stream, not a phone. Speaker routing, ringback,
 * ringtone and the end tone all live in the platform audio session, and none
 * of them happen on their own — the bug this covers was a speaker button that
 * only ever flipped a label.
 */
import {
  isCallAudioAvailable,
  resetCallAudioCache,
  setSpeaker,
  startInCallAudio,
  startIncomingRinging,
  startOutgoingAudio,
  stopCallAudio,
} from '../src/yaychat/services/calls/audioSession';

beforeEach(() => {
  resetCallAudioCache();
});

describe('call audio availability', () => {
  it('reports unavailable when the native module is not linked', () => {
    // Same rule as WebRTC and the recorder: the JS package resolving proves
    // nothing before a native rebuild.
    expect(isCallAudioAvailable()).toBe(false);
  });
});

describe('without the native module', () => {
  it('lets a call run silently rather than throwing', () => {
    // Routing and tones are an enhancement to a call, not a precondition for
    // one. A build missing the module must still connect audio, so every entry
    // point has to be a no-op instead of an exception mid-call.
    expect(() => startOutgoingAudio('audio')).not.toThrow();
    expect(() => startIncomingRinging()).not.toThrow();
    expect(() => startInCallAudio('video', true)).not.toThrow();
    expect(() => setSpeaker(true)).not.toThrow();
    expect(() => stopCallAudio(true)).not.toThrow();
  });

  it('tolerates teardown that never had a matching start', () => {
    // `finish()` runs on paths where the call never began — a declined invite,
    // an offer that failed before media opened.
    expect(() => stopCallAudio(false)).not.toThrow();
  });
});
