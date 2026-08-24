/**
 * WebRTC engine adapter.
 *
 * `react-native-webrtc` is a native module: it only exists once the package is
 * installed *and* the app has been rebuilt (`pod install` on iOS, a Gradle sync
 * on Android). Importing it statically would crash the JS bundle on any build
 * that has not been through that, including the test runner — so it is resolved
 * at runtime and its absence is a first-class state rather than an exception.
 *
 * Everything above this file talks to `RtcEngine`, so adding the native module
 * turns calling on without a single change to the call state machine or the UI.
 */

export interface RtcIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/** The slice of `RTCPeerConnection` the call service actually uses. */
export interface RtcPeerConnection {
  addTrack(track: any, stream: any): void;
  createOffer(options?: any): Promise<{type: string; sdp: string}>;
  createAnswer(options?: any): Promise<{type: string; sdp: string}>;
  setLocalDescription(description: any): Promise<void>;
  setRemoteDescription(description: any): Promise<void>;
  addIceCandidate(candidate: any): Promise<void>;
  getSenders(): any[];
  close(): void;
  onicecandidate: ((event: any) => void) | null;
  ontrack: ((event: any) => void) | null;
  oniceconnectionstatechange: (() => void) | null;
  iceConnectionState: string;
}

export interface RtcModule {
  RTCPeerConnection: new (config: {iceServers: RtcIceServer[]}) => RtcPeerConnection;
  RTCSessionDescription: new (init: {type: string; sdp: string}) => any;
  RTCIceCandidate: new (init: Record<string, unknown>) => any;
  mediaDevices: {
    getUserMedia(constraints: Record<string, unknown>): Promise<any>;
  };
  /** Present in react-native-webrtc; used to render the video streams. */
  RTCView?: any;
  registerGlobals?: () => void;
}

let cached: RtcModule | null | undefined;

/**
 * Is the *native* side of react-native-webrtc actually linked?
 *
 * The JS package resolving proves nothing: after `npm install` but before a
 * `pod install` / Gradle rebuild, the JS is present and the native module is
 * not. Without this check the app would advertise calling, then fail at
 * `getUserMedia` — the worst moment to discover it, since the other person's
 * phone is already ringing.
 */
const nativeModuleLinked = (): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {NativeModules} = require('react-native');
    return Boolean(NativeModules?.WebRTCModule);
  } catch {
    return false;
  }
};

/**
 * The native module, or `null` when this build does not have it.
 *
 * Resolved once and memoised — a failed require is not worth repeating on every
 * call, and the answer cannot change without restarting the app.
 */
export const rtc = (): RtcModule | null => {
  if (cached !== undefined) {
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-webrtc');
    if (!mod?.RTCPeerConnection || !mod?.mediaDevices || !nativeModuleLinked()) {
      cached = null;
      return cached;
    }
    // Installs WebRTC's globals so any library expecting the browser API works.
    mod.registerGlobals?.();
    cached = mod as RtcModule;
  } catch {
    cached = null;
  }
  return cached;
};

export const isRtcAvailable = (): boolean => rtc() !== null;

/** Test hook — forgets the resolved module. */
export const resetRtcCache = () => {
  cached = undefined;
};

export class RtcUnavailableError extends Error {
  constructor() {
    super(
      'Calling is not available in this build. It needs the WebRTC native module, which arrives in the next app release.',
    );
    this.name = 'RtcUnavailableError';
  }
}

/**
 * Open the microphone (and camera for video calls).
 *
 * Throws whatever the platform threw, so the caller can tell a denied
 * permission — which needs a settings prompt — from a busy device.
 */
export const openLocalStream = async (media: 'audio' | 'video'): Promise<any> => {
  const engine = rtc();
  if (!engine) {
    throw new RtcUnavailableError();
  }
  return engine.mediaDevices.getUserMedia({
    audio: true,
    video:
      media === 'video'
        ? {facingMode: 'user', width: {ideal: 1280}, height: {ideal: 720}}
        : false,
  });
};

/** Stop every track on a stream. Skipping this leaves the camera light on. */
export const stopStream = (stream: any) => {
  try {
    stream?.getTracks?.().forEach((track: any) => track.stop());
  } catch {
    // A stream that is already torn down is not an error worth surfacing.
  }
};
