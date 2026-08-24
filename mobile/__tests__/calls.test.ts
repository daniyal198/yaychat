/**
 * 1:1 audio and video calls.
 *
 * Media needs `react-native-webrtc`, a native module absent from the test
 * runner — which is exactly the state a build is in before it has been rebuilt
 * with the package. These tests pin the behaviour that matters in that state
 * and in the state machine around it: calling must be *hidden*, never offered
 * and then failed; a call must never be placed without a working media stack;
 * and a call that ends must release the microphone.
 */
import {callService} from '../src/yaychat/services/calls/callService';
import {
  isRtcAvailable,
  openLocalStream,
  resetRtcCache,
  RtcUnavailableError,
  stopStream,
} from '../src/yaychat/services/calls/webrtc';
import {callHistoryService} from '../src/yaychat/services/calls/callHistory';
import {simulation} from '../src/yaychat/services';

beforeAll(() => {
  simulation.latencyMs = 0;
});

beforeEach(() => {
  resetRtcCache();
  callService.resetCapabilities();
  callService.clear();
});

describe('WebRTC availability', () => {
  it('reports unavailable when the native module is not linked', () => {
    // The JS package can resolve while the native side is missing — after an
    // `npm install` but before a `pod install`. Trusting the JS require alone
    // would advertise calling and then fail at getUserMedia, with the other
    // person's phone already ringing.
    expect(isRtcAvailable()).toBe(false);
  });

  it('refuses to open a microphone stream without the native module', async () => {
    await expect(openLocalStream('audio')).rejects.toBeInstanceOf(RtcUnavailableError);
  });

  it('treats tearing down a missing stream as a no-op', () => {
    // Teardown runs on every path out of a call, including ones where the
    // stream was never opened. Throwing here would strand the call in `ended`.
    expect(() => stopStream(null)).not.toThrow();
    expect(() => stopStream({getTracks: () => [{stop: () => undefined}]})).not.toThrow();
  });
});

describe('call capabilities', () => {
  it('is unavailable and says which half is missing', async () => {
    const capability = await callService.capabilities();
    expect(capability.available).toBe(false);
    expect(capability.clientSupported).toBe(false);
    // "Update the app" and "calling is off on the server" are different
    // instructions; the reason has to distinguish them.
    expect(capability.reason).toMatch(/app update/i);
  });

  it('caches the probe so every chat screen does not re-ask', async () => {
    const first = await callService.capabilities();
    const second = await callService.capabilities();
    expect(second).toBe(first);
  });
});

describe('call state machine', () => {
  it('starts idle with no media open', () => {
    const state = callService.current();
    expect(state.phase).toBe('idle');
    expect(state.callId).toBeNull();
    expect(state.localStream).toBeNull();
    expect(state.remoteStream).toBeNull();
  });

  it('publishes the current state to a new subscriber immediately', () => {
    const seen: string[] = [];
    const unsubscribe = callService.subscribe(state => seen.push(state.phase));
    unsubscribe();
    // A screen that mounts mid-call has to render that call, not an empty
    // frame that waits for the next transition.
    expect(seen).toEqual(['idle']);
  });

  it('refuses to place a call when calling is unavailable', async () => {
    await expect(callService.place('ben@example.com', 'audio')).rejects.toBeInstanceOf(
      RtcUnavailableError,
    );
    expect(callService.current().phase).toBe('idle');
  });

  it('ignores mute and camera toggles when no call is running', () => {
    expect(() => callService.toggleMute()).not.toThrow();
    expect(() => callService.toggleCamera()).not.toThrow();
    expect(() => callService.switchCamera()).not.toThrow();
  });

  it('treats hanging up with no call as a no-op', async () => {
    await expect(callService.hangUp()).resolves.toBeUndefined();
  });

  it('returns to a fully cleared state', () => {
    callService.clear();
    const state = callService.current();
    expect(state.phase).toBe('idle');
    expect(state.endReason).toBeNull();
    expect(state.durationSeconds).toBe(0);
    expect(state.muted).toBe(false);
  });
});

describe('call history', () => {
  it('is empty rather than seeded when the module is not served', async () => {
    // A fabricated "missed call from Mia" is indistinguishable from a real one
    // and would send someone chasing a conversation that never happened.
    await expect(callHistoryService.list()).resolves.toEqual([]);
  });
});
