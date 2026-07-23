/**
 * Mock transport layer.
 *
 * Screens never touch mock data directly — they call feature services which
 * run through `mockRequest`. In Milestone 2/3 the services swap this call for
 * a real HTTP/WebSocket client while keeping the same signatures.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ApiError extends Error {
  constructor(
    message: string,
    public code:
      | 'validation'
      | 'unauthorized'
      | 'server'
      | 'offline'
      | 'not_found'
      | 'rate_limited',
  ) {
    super(message);
  }
}

/** Dev-tunable simulation controls (exposed in Profile → Developer). */
export const simulation = {
  latencyMs: 450,
  offline: false,
  failNextRequest: null as null | ApiError['code'],
};

export const setSimulatedOffline = (offline: boolean) => {
  simulation.offline = offline;
  offlineListeners.forEach(l => l(offline));
};

const offlineListeners = new Set<(offline: boolean) => void>();
export const onOfflineChange = (listener: (offline: boolean) => void) => {
  offlineListeners.add(listener);
  return () => {
    offlineListeners.delete(listener);
  };
};

export const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function mockRequest<T>(
  _name: string,
  resolver: () => T,
  options?: {latencyMs?: number},
): Promise<T> {
  await delay(options?.latencyMs ?? simulation.latencyMs);
  if (simulation.offline) {
    throw new ApiError('No internet connection.', 'offline');
  }
  if (simulation.failNextRequest) {
    const code = simulation.failNextRequest;
    simulation.failNextRequest = null;
    throw new ApiError(
      code === 'server'
        ? 'The Yay-chat service is unavailable right now.'
        : code === 'unauthorized'
        ? 'Your session has expired. Please sign in again.'
        : 'Request failed.',
      code,
    );
  }
  return resolver();
}

export const errorMessage = (e: unknown): string =>
  e instanceof ApiError ? e.message : 'Something unexpected happened.';

export const isOfflineError = (e: unknown): boolean =>
  e instanceof ApiError && e.code === 'offline';

// ---------------------------------------------------------------------------
// Secure token storage interface (mock-backed; real keychain in Milestone 2)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'yaychat.session.v1';

export const secureTokenStore = {
  async save(sessionJson: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, sessionJson);
  },
  async load(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
};

// ---------------------------------------------------------------------------
// Analytics interface (console-backed until Milestone 2)
// ---------------------------------------------------------------------------

export const analytics = {
  track(event: string, props?: Record<string, unknown>) {
    if (__DEV__) {
      console.log(`[analytics] ${event}`, props ?? {});
    }
  },
  screen(name: string) {
    this.track('screen_view', {name});
  },
};

// ---------------------------------------------------------------------------
// Feature flags (static map until Milestone 2)
// ---------------------------------------------------------------------------

const flags: Record<string, boolean> = {
  wallet_preview: true,
  btcy_preview: true,
  earn_center: true,
  ai_assistant: true,
  communities: true,
  ecosystem_discovery: true,
  stickers: false,
  gifs: false,
  image_generation: false,
  calls: false,
  dark_mode: false,
};

export const featureFlags = {
  isEnabled: (flag: string): boolean => flags[flag] ?? false,
  all: (): Record<string, boolean> => ({...flags}),
  set: (flag: string, value: boolean) => {
    flags[flag] = value;
  },
};
