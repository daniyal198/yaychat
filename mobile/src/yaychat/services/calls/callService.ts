/**
 * 1:1 audio and video calls.
 *
 * The call state machine lives here so the UI stays a pure rendering of
 * `CallState`. Signaling rides the shared chat socket; media is peer-to-peer
 * WebRTC and never reaches a YaysApp server.
 *
 * Three constraints shape the design:
 *
 *  - **The native module may be absent.** `react-native-webrtc` needs a rebuilt
 *    binary. Until then `capabilities()` reports calling unavailable and the UI
 *    hides call buttons, rather than offering a button that throws.
 *  - **The server owns the outcome.** Ring timeouts, "who hung up", and busy
 *    checks are decided by the backend, so two devices racing cannot disagree
 *    about what happened. The client reflects `call:ended`, it does not invent it.
 *  - **ICE candidates arrive out of order.** Candidates routinely land before
 *    the remote description is set; they are queued and flushed rather than
 *    dropped, which is the usual cause of calls that ring but never connect.
 */
import {ApiError} from '../client';
import {dataMode} from '../dataMode';
import {sharedRealtimeSocket} from '../index';
import {
  isRtcAvailable,
  openLocalStream,
  rtc,
  RtcIceServer,
  RtcPeerConnection,
  RtcUnavailableError,
  stopStream,
} from './webrtc';

export type CallMedia = 'audio' | 'video';

export type CallPhase =
  | 'idle'
  /** Outgoing: placed, waiting for the callee to pick up. */
  | 'dialing'
  /** Incoming: ringing on this device. */
  | 'ringing'
  /** Answered; media is negotiating. */
  | 'connecting'
  /** Media flowing. */
  | 'connected'
  | 'ended';

export type CallEndReason =
  | 'hangup'
  | 'declined'
  | 'no_answer'
  | 'caller_cancelled'
  | 'busy'
  | 'connection_failed'
  | 'unsupported_client'
  | 'handled_elsewhere';

export interface CallState {
  phase: CallPhase;
  callId: string | null;
  peer: string | null;
  peerName: string | null;
  media: CallMedia;
  direction: 'incoming' | 'outgoing' | null;
  /** Local MediaStream, or null before the mic/camera is open. */
  localStream: any | null;
  remoteStream: any | null;
  muted: boolean;
  cameraOff: boolean;
  speakerOn: boolean;
  /** Seconds since media connected. Drives the in-call timer. */
  durationSeconds: number;
  endReason: CallEndReason | null;
  error: string | null;
}

export interface CallCapabilities {
  /** True only when the backend serves calls *and* the native module is present. */
  available: boolean;
  /** Native module missing — needs an app rebuild, not a config change. */
  clientSupported: boolean;
  backendEnabled: boolean;
  /** False when no TURN relay is configured: calls fail behind strict NAT. */
  relayConfigured: boolean;
  reason: string | null;
}

const CALLS_BASE = '/api/v1/yays/calls';

const idleState = (): CallState => ({
  phase: 'idle',
  callId: null,
  peer: null,
  peerName: null,
  media: 'audio',
  direction: null,
  localStream: null,
  remoteStream: null,
  muted: false,
  cameraOff: false,
  speakerOn: false,
  durationSeconds: 0,
  endReason: null,
  error: null,
});

const randomCallId = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = (Math.random() * 16) | 0;
    return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });

const nameOf = (email: string): string => email.split('@')[0];

type Listener = (state: CallState) => void;

class CallController {
  private state: CallState = idleState();
  private listeners = new Set<Listener>();
  private pc: RtcPeerConnection | null = null;
  private iceServers: RtcIceServer[] = [];
  /** Candidates that arrived before `setRemoteDescription`. */
  private pendingCandidates: any[] = [];
  private remoteDescriptionSet = false;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private connectedAt: number | null = null;
  private socketBound = false;
  private capabilityCache: CallCapabilities | null = null;

  // -- subscription ---------------------------------------------------------

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  current(): CallState {
    return this.state;
  }

  private patch(changes: Partial<CallState>) {
    this.state = {...this.state, ...changes};
    this.listeners.forEach(listener => listener(this.state));
  }

  // -- capability -----------------------------------------------------------

  /**
   * Whether calling can be offered, cached for the session.
   *
   * Both halves have to be true and they fail for different reasons, so the
   * result carries which one is missing — "update the app" and "calling is off
   * on the server" are not the same message to a user.
   */
  async capabilities(): Promise<CallCapabilities> {
    if (this.capabilityCache) {
      return this.capabilityCache;
    }
    const clientSupported = isRtcAvailable();
    let backendEnabled = false;
    let relayConfigured = false;

    try {
      const socket = await sharedRealtimeSocket();
      if (socket) {
        const config = await this.request<any>(socket, 'call:config', {});
        backendEnabled = Boolean(config?.enabled);
        relayConfigured = Boolean(config?.relayConfigured);
      }
    } catch {
      backendEnabled = false;
    }

    const available = clientSupported && backendEnabled;
    this.capabilityCache = {
      available,
      clientSupported,
      backendEnabled,
      relayConfigured,
      reason: available
        ? null
        : !clientSupported
        ? 'Calling needs the next app update.'
        : 'Calling is not enabled on this server yet.',
    };
    dataMode.set('calls', available);
    return this.capabilityCache;
  }

  /** Test hook — forgets the cached capability probe. */
  resetCapabilities() {
    this.capabilityCache = null;
  }

  // -- socket ---------------------------------------------------------------

  private request<T>(socket: any, event: string, payload: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new ApiError('The call service is not responding.', 'server')),
        8000,
      );
      socket.emit(event, payload, (result: T) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }

  /**
   * Attach the incoming-call handlers.
   *
   * Called once at sign-in, not per call: a call can arrive at any time, and a
   * device that only listens while already on the call screen never rings.
   */
  async bind(): Promise<void> {
    if (this.socketBound) {
      return;
    }
    const socket = await sharedRealtimeSocket();
    if (!socket) {
      return;
    }
    this.socketBound = true;

    socket.on('call:incoming', (payload: any) => this.onIncoming(payload));
    socket.on('call:accepted', () => this.onAccepted());
    socket.on('call:offer', (payload: any) => this.onOffer(payload));
    socket.on('call:answer', (payload: any) => this.onAnswer(payload));
    socket.on('call:candidate', (payload: any) => this.onCandidate(payload));
    socket.on('call:ended', (payload: any) =>
      this.finish(payload?.reason ?? 'hangup', payload?.callId),
    );
    // Another of this user's devices picked up or declined.
    socket.on('call:handled', (payload: any) => {
      if (payload?.callId === this.state.callId && this.state.phase === 'ringing') {
        this.finish('handled_elsewhere', payload.callId);
      }
    });
  }

  unbind() {
    this.socketBound = false;
  }

  // -- outgoing -------------------------------------------------------------

  async place(peerEmail: string, media: CallMedia): Promise<void> {
    const capability = await this.capabilities();
    if (!capability.available) {
      throw new RtcUnavailableError();
    }
    if (this.state.phase !== 'idle' && this.state.phase !== 'ended') {
      throw new ApiError('You are already on a call.', 'validation');
    }

    const socket = await sharedRealtimeSocket();
    if (!socket) {
      throw new ApiError('You appear to be offline.', 'offline');
    }

    const callId = randomCallId();
    this.reset();
    this.patch({
      phase: 'dialing',
      callId,
      peer: peerEmail,
      peerName: nameOf(peerEmail),
      media,
      direction: 'outgoing',
      cameraOff: false,
      speakerOn: media === 'video',
    });

    // Open the mic before inviting: a permission denial should fail the call
    // before the other person's phone rings, not after they answer.
    try {
      const stream = await openLocalStream(media);
      this.patch({localStream: stream});
    } catch (error) {
      this.finish('connection_failed', callId);
      throw new ApiError(
        'YaysApp needs microphone access to make calls. Enable it in Settings.',
        'validation',
      );
    }

    const result = await this.request<any>(socket, 'call:invite', {
      callId,
      to: peerEmail,
      media,
    });

    if (!result?.ok) {
      const message =
        result?.code === 'busy'
          ? 'They are already on another call.'
          : result?.message || 'Could not start the call.';
      this.finish(result?.code === 'busy' ? 'busy' : 'connection_failed', callId);
      throw new ApiError(message, 'validation');
    }
  }

  /** Callee answered — build the peer connection and send the offer. */
  private async onAccepted(): Promise<void> {
    if (this.state.direction !== 'outgoing' || !this.state.callId) {
      return;
    }
    this.patch({phase: 'connecting'});
    try {
      const engine = rtc();
      const socket = await sharedRealtimeSocket();
      if (!engine || !socket) {
        throw new RtcUnavailableError();
      }
      await this.createPeerConnection();
      const offer = await this.pc!.createOffer({});
      await this.pc!.setLocalDescription(offer);
      socket.emit('call:offer', {
        callId: this.state.callId,
        sdp: offer.sdp,
        type: offer.type,
      });
    } catch (error) {
      await this.reportFailure();
    }
  }

  // -- incoming -------------------------------------------------------------

  private onIncoming(payload: any) {
    const callId = String(payload?.callId || '');
    if (!callId) {
      return;
    }
    // Already busy: let the server know so the caller hears "busy" rather than
    // ringing out to a device that will never answer.
    if (this.state.phase !== 'idle' && this.state.phase !== 'ended') {
      sharedRealtimeSocket()
        .then(socket => socket?.emit('call:decline', {callId}))
        .catch(() => {});
      return;
    }
    this.reset();
    const from = String(payload?.from || '');
    this.patch({
      phase: 'ringing',
      callId,
      peer: from,
      peerName: nameOf(from),
      media: payload?.media === 'video' ? 'video' : 'audio',
      direction: 'incoming',
      speakerOn: payload?.media === 'video',
    });
  }

  async accept(): Promise<void> {
    const {callId, media} = this.state;
    if (!callId || this.state.phase !== 'ringing') {
      return;
    }
    const socket = await sharedRealtimeSocket();
    if (!socket) {
      throw new ApiError('You appear to be offline.', 'offline');
    }

    this.patch({phase: 'connecting'});
    try {
      const stream = await openLocalStream(media);
      this.patch({localStream: stream});
      await this.createPeerConnection();
    } catch {
      await this.reportFailure();
      throw new ApiError(
        'YaysApp needs microphone access to answer calls. Enable it in Settings.',
        'validation',
      );
    }

    // Told last: the caller starts sending the offer the moment this lands, and
    // the peer connection has to exist to receive it.
    const result = await this.request<any>(socket, 'call:accept', {callId});
    if (!result?.ok) {
      this.finish('no_answer', callId);
    }
  }

  async decline(): Promise<void> {
    const {callId} = this.state;
    if (!callId) {
      return;
    }
    const socket = await sharedRealtimeSocket();
    socket?.emit('call:decline', {callId});
    this.finish('declined', callId);
  }

  // -- negotiation ----------------------------------------------------------

  private async createPeerConnection(): Promise<void> {
    const engine = rtc();
    if (!engine) {
      throw new RtcUnavailableError();
    }

    // Fetched per call: TURN credentials are short-lived by design.
    const socket = await sharedRealtimeSocket();
    if (socket) {
      try {
        const config = await this.request<any>(socket, 'call:config', {});
        this.iceServers = Array.isArray(config?.iceServers) ? config.iceServers : [];
      } catch {
        this.iceServers = [];
      }
    }

    const pc = new engine.RTCPeerConnection({iceServers: this.iceServers});
    this.pc = pc;
    this.remoteDescriptionSet = false;
    this.pendingCandidates = [];

    const local = this.state.localStream;
    if (local) {
      local.getTracks().forEach((track: any) => pc.addTrack(track, local));
    }

    pc.onicecandidate = (event: any) => {
      if (event?.candidate && this.state.callId) {
        sharedRealtimeSocket()
          .then(s =>
            s?.emit('call:candidate', {
              callId: this.state.callId,
              candidate: event.candidate,
            }),
          )
          .catch(() => {});
      }
    };

    pc.ontrack = (event: any) => {
      const stream = event?.streams?.[0];
      if (stream) {
        this.patch({remoteStream: stream});
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === 'connected' || iceState === 'completed') {
        this.markConnected();
      } else if (iceState === 'failed') {
        // Almost always a NAT that needs a TURN relay. Reported to the server
        // so the failure shows up as `failed`, not as a normal hang-up.
        this.reportFailure().catch(() => {});
      }
    };
  }

  private async onOffer(payload: any): Promise<void> {
    if (payload?.callId !== this.state.callId || !this.pc) {
      return;
    }
    const engine = rtc();
    const socket = await sharedRealtimeSocket();
    if (!engine || !socket) {
      return;
    }
    try {
      await this.pc.setRemoteDescription(
        new engine.RTCSessionDescription({type: payload.type, sdp: payload.sdp}),
      );
      await this.flushCandidates();
      const answer = await this.pc.createAnswer({});
      await this.pc.setLocalDescription(answer);
      socket.emit('call:answer', {
        callId: this.state.callId,
        sdp: answer.sdp,
        type: answer.type,
      });
    } catch {
      await this.reportFailure();
    }
  }

  private async onAnswer(payload: any): Promise<void> {
    if (payload?.callId !== this.state.callId || !this.pc) {
      return;
    }
    const engine = rtc();
    if (!engine) {
      return;
    }
    try {
      await this.pc.setRemoteDescription(
        new engine.RTCSessionDescription({type: payload.type, sdp: payload.sdp}),
      );
      await this.flushCandidates();
    } catch {
      await this.reportFailure();
    }
  }

  private async onCandidate(payload: any): Promise<void> {
    if (payload?.callId !== this.state.callId || !payload?.candidate) {
      return;
    }
    const engine = rtc();
    if (!engine || !this.pc) {
      return;
    }
    const candidate = new engine.RTCIceCandidate(payload.candidate);
    if (!this.remoteDescriptionSet) {
      // Candidates legitimately arrive before the answer. Queueing them is what
      // keeps a call from ringing and then never connecting.
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      // A rejected candidate is normal — others usually still work.
    }
  }

  private async flushCandidates(): Promise<void> {
    this.remoteDescriptionSet = true;
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) {
      try {
        await this.pc?.addIceCandidate(candidate);
      } catch {
        // As above.
      }
    }
  }

  // -- in-call controls -----------------------------------------------------

  toggleMute(): void {
    const stream = this.state.localStream;
    const muted = !this.state.muted;
    stream?.getAudioTracks?.().forEach((track: any) => {
      track.enabled = !muted;
    });
    this.patch({muted});
  }

  toggleCamera(): void {
    if (this.state.media !== 'video') {
      return;
    }
    const stream = this.state.localStream;
    const cameraOff = !this.state.cameraOff;
    stream?.getVideoTracks?.().forEach((track: any) => {
      track.enabled = !cameraOff;
    });
    this.patch({cameraOff});
  }

  toggleSpeaker(): void {
    this.patch({speakerOn: !this.state.speakerOn});
  }

  /** Flip between front and back cameras without renegotiating. */
  switchCamera(): void {
    this.state.localStream?.getVideoTracks?.().forEach((track: any) => {
      track._switchCamera?.();
    });
  }

  async hangUp(): Promise<void> {
    const {callId} = this.state;
    if (!callId) {
      return;
    }
    const socket = await sharedRealtimeSocket();
    socket?.emit('call:hangup', {callId});
    this.finish('hangup', callId);
  }

  private async reportFailure(): Promise<void> {
    const {callId} = this.state;
    if (callId) {
      const socket = await sharedRealtimeSocket();
      socket?.emit('call:failed', {callId});
    }
    this.finish('connection_failed', callId);
  }

  // -- lifecycle ------------------------------------------------------------

  private markConnected() {
    if (this.state.phase === 'connected') {
      return;
    }
    this.connectedAt = Date.now();
    this.patch({phase: 'connected', durationSeconds: 0});
    this.durationTimer = setInterval(() => {
      if (this.connectedAt) {
        this.patch({
          durationSeconds: Math.floor((Date.now() - this.connectedAt) / 1000),
        });
      }
    }, 1000);
  }

  /** Move to `ended`, releasing the mic/camera and the peer connection. */
  private finish(reason: CallEndReason, callId?: string | null) {
    if (callId && this.state.callId && callId !== this.state.callId) {
      return;
    }
    if (this.state.phase === 'idle' || this.state.phase === 'ended') {
      return;
    }
    this.teardown();
    this.patch({phase: 'ended', endReason: reason});
  }

  /** Return to idle. Called by the UI once the "call ended" screen is dismissed. */
  clear(): void {
    this.teardown();
    this.state = idleState();
    this.listeners.forEach(listener => listener(this.state));
  }

  private reset() {
    this.teardown();
    this.state = idleState();
  }

  private teardown() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    this.connectedAt = null;
    stopStream(this.state.localStream);
    try {
      this.pc?.close();
    } catch {
      // Closing an already-closed connection is not an error.
    }
    this.pc = null;
    this.pendingCandidates = [];
    this.remoteDescriptionSet = false;
  }

  // -- history --------------------------------------------------------------

  historyPath(): string {
    return `${CALLS_BASE}/history`;
  }
}

export const callService = new CallController();
export {RtcUnavailableError};
