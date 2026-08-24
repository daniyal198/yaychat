/**
 * Call history.
 *
 * Read from the backend when the calls module is served, and empty otherwise —
 * deliberately not seeded with sample calls. A fabricated "missed call from
 * Mia" is indistinguishable from a real one and would send someone chasing a
 * conversation that never happened.
 */
import {ApiError} from '../client';
import {authedGet, backendJson, usesLiveAuth} from '../index';

export interface CallHistoryEntry {
  callId: string;
  direction: 'incoming' | 'outgoing';
  peer: string;
  peerName: string;
  media: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'declined' | 'missed' | 'cancelled' | 'failed';
  durationSeconds: number;
  missed: boolean;
  createdAt: string;
  endedAt: string | null;
}

const CALLS_BASE = '/api/v1/yays/calls';

const toEntry = (raw: any): CallHistoryEntry => ({
  callId: String(raw?.callId || ''),
  direction: raw?.direction === 'outgoing' ? 'outgoing' : 'incoming',
  peer: String(raw?.peer || ''),
  peerName: String(raw?.peerName || raw?.peer || 'Unknown'),
  media: raw?.media === 'video' ? 'video' : 'audio',
  status: raw?.status ?? 'ended',
  durationSeconds: Number(raw?.durationSeconds) || 0,
  missed: Boolean(raw?.missed),
  createdAt: String(raw?.createdAt || new Date().toISOString()),
  endedAt: raw?.endedAt ? String(raw.endedAt) : null,
});

export const callHistoryService = {
  async list(limit = 50): Promise<CallHistoryEntry[]> {
    // A build with the backend disabled has no calls to show and no server to
    // ask. Attempting the request anyway surfaces an "offline" error on a
    // screen that is simply empty, which reads as a fault rather than a state.
    if (!usesLiveAuth()) {
      return [];
    }
    try {
      const payload = backendJson(
        await authedGet<any>(`${CALLS_BASE}/history`, {limit}),
      );
      return (payload?.items || []).map(toEntry);
    } catch (e) {
      // A deployment without the calls module is not an error state for the
      // user — they simply have no call history yet.
      if (e instanceof ApiError && (e.code === 'not_found' || e.code === 'unauthorized')) {
        return [];
      }
      throw e;
    }
  },
};
