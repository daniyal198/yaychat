/**
 * Which feature modules are being served by the real backend.
 *
 * The service layer probes each module once per session and records the answer
 * here. The UI reads it to decide whether to show the "preview data" banner:
 * the banner is a promise to the user that nothing on screen is real, so it
 * must disappear the moment a module starts returning live data — and it must
 * stay up while a module is still on the local fallback.
 *
 * Deliberately dependency-free so both the service layer and the design kit can
 * import it without creating a cycle.
 */

export type DataModule =
  | 'chat'
  | 'communities'
  | 'ai'
  | 'notifications'
  | 'rewards'
  | 'ecosystem'
  | 'calls';

const live: Record<string, boolean> = {};
const listeners = new Set<(module: DataModule, isLive: boolean) => void>();

export const dataMode = {
  /** True only once a module has been confirmed live; unknown counts as mock. */
  isLive(module: DataModule): boolean {
    return live[module] === true;
  },

  set(module: DataModule, isLive: boolean) {
    if (live[module] === isLive) {
      return;
    }
    live[module] = isLive;
    listeners.forEach(listener => listener(module, isLive));
  },

  subscribe(listener: (module: DataModule, isLive: boolean) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Test hook — forgets every probe result. */
  reset() {
    Object.keys(live).forEach(key => delete live[key]);
    listeners.forEach(listener => listener('rewards', false));
  },
};
