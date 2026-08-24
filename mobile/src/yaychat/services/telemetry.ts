import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

/**
 * Module 6 — the client half of the analytics and crash pipeline.
 *
 * Design constraints that shaped this:
 *
 *  - **Never block the UI.** `track()` is synchronous and returns immediately;
 *    the flush happens on a timer or when the queue fills.
 *  - **Never lose the last events before a crash.** The queue is mirrored to
 *    AsyncStorage on every enqueue, so a fatal error still leaves the trail
 *    that explains it on disk for the next launch.
 *  - **Never double-count.** Every event carries a client-generated id, and
 *    the server's unique index makes a retried batch a no-op — so a failed
 *    flush can be retried without hesitation.
 *  - **Never send message content.** Only declared, scalar properties survive
 *    the server's catalogue, and nothing here reads user text.
 */

const QUEUE_KEY = 'yaychat.telemetry.queue.v1';
const ANON_KEY = 'yaychat.telemetry.anon.v1';
const CRASH_KEY = 'yaychat.telemetry.pendingCrash.v1';

const MAX_QUEUE = 200;
const FLUSH_AT = 20;
const FLUSH_INTERVAL_MS = 30000;
/** Coalescing window for mirroring the queue to storage. */
const PERSIST_DEBOUNCE_MS = 200;
/** Screens kept as crash breadcrumbs. */
const MAX_BREADCRUMBS = 20;

export interface QueuedEvent {
  eventId: string;
  name: string;
  props: Record<string, string | number | boolean>;
  occurredAt: string;
  sessionId: string;
}

export interface CrashPayload {
  crashId: string;
  level: 'fatal' | 'handled';
  name: string;
  message: string;
  stack: string;
  breadcrumbs: string[];
  occurredAt: string;
  osVersion?: string;
}

export interface TelemetryTransport {
  sendEvents(batch: {
    events: QueuedEvent[];
    anonymousId: string;
    platform: string;
    appVersion?: string;
  }): Promise<void>;
  sendCrash(payload: {
    crash: CrashPayload;
    anonymousId: string;
    platform: string;
    appVersion?: string;
  }): Promise<void>;
}

/** Cheap unique id — this runs on the hot path and does not need crypto. */
const uid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** Drop non-scalars and cap strings before anything reaches the queue. */
const cleanProps = (
  props: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> => {
  if (!props) {
    return {};
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isScalar(value)) {
      out[key] = typeof value === 'string' ? value.slice(0, 120) : value;
    }
  }
  return out;
};

class Telemetry {
  private queue: QueuedEvent[] = [];
  private breadcrumbs: string[] = [];
  private sessionId = uid('s');
  private anonymousId = '';
  private appVersion: string | undefined;
  private transport: TelemetryTransport | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private started = false;
  /**
   * Bumped by `stop()`. `start()` reads it before installing its timer, so a
   * provider that unmounts while the async startup is still in flight cannot
   * leave an orphaned interval running — the case that keeps a test process
   * (or a fast sign-out) alive after everything else has torn down.
   */
  private generation = 0;
  private restoreCrashHandler: (() => void) | null = null;

  /**
   * Start the pipeline. Safe to call more than once — a re-entry after a
   * sign-in swap just replaces the transport.
   */
  async start(transport: TelemetryTransport, options?: {appVersion?: string}) {
    this.transport = transport;
    this.appVersion = options?.appVersion;
    if (this.started) {
      return;
    }
    this.started = true;
    const generation = this.generation;

    this.anonymousId = await this.loadAnonymousId();
    await this.restoreQueue();
    await this.reportPendingCrash();

    if (generation !== this.generation) {
      // `stop()` ran while we were awaiting storage — do not arm the timer.
      return;
    }

    this.timer = setInterval(() => {
      this.flush().catch(() => {});
    }, FLUSH_INTERVAL_MS);

    this.track('session_start');
  }

  stop() {
    this.generation += 1;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.persistTimer) {
      // Write out whatever the coalescing window was still holding.
      this.persistNow().catch(() => {});
    }
    this.restoreCrashHandler?.();
    this.restoreCrashHandler = null;
    this.started = false;
  }

  /** Queue an event. Synchronous by contract — callers are on the UI path. */
  track(name: string, props?: Record<string, unknown>) {
    const event: QueuedEvent = {
      eventId: uid('e'),
      name,
      props: cleanProps(props),
      occurredAt: new Date().toISOString(),
      sessionId: this.sessionId,
    };
    this.queue.push(event);
    if (this.queue.length > MAX_QUEUE) {
      // Drop the oldest: the events nearest a problem are the useful ones.
      this.queue.splice(0, this.queue.length - MAX_QUEUE);
    }
    this.persistQueue();
    if (this.queue.length >= FLUSH_AT) {
      this.flush().catch(() => {});
    }
  }

  screen(name: string) {
    this.breadcrumbs.push(`screen:${name}`);
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
    this.track('screen_view', {name});
  }

  /** Extra context for the next crash — never sent on its own. */
  breadcrumb(note: string) {
    this.breadcrumbs.push(note.slice(0, 120));
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Ship whatever is queued. Events are removed optimistically and restored on
   * failure, so a flush that fails mid-request neither loses nor duplicates
   * (the server's `eventId` index absorbs a re-send).
   */
  async flush(): Promise<void> {
    if (this.flushing || !this.transport || this.queue.length === 0) {
      return;
    }
    this.flushing = true;
    const batch = this.queue.slice(0, 100);
    this.queue = this.queue.slice(batch.length);
    try {
      await this.transport.sendEvents({
        events: batch,
        anonymousId: this.anonymousId,
        platform: Platform.OS,
        appVersion: this.appVersion,
      });
      await this.persistNow();
    } catch {
      this.queue = [...batch, ...this.queue].slice(-MAX_QUEUE);
      await this.persistNow();
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Report an error. Fatal reports are written to disk *before* the network
   * call: a crash that kills the JS thread will not survive an in-flight
   * request, but it will survive AsyncStorage, and the next launch sends it.
   */
  async reportError(
    error: unknown,
    options?: {fatal?: boolean; osVersion?: string},
  ): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));
    const payload: CrashPayload = {
      crashId: uid('c'),
      level: options?.fatal === false ? 'handled' : 'fatal',
      name: err.name || 'Error',
      message: String(err.message || '').slice(0, 1000),
      stack: String(err.stack || '').slice(0, 8000),
      breadcrumbs: [...this.breadcrumbs],
      occurredAt: new Date().toISOString(),
      osVersion: options?.osVersion || String(Platform.Version),
    };

    if (payload.level === 'fatal') {
      // Force the queue out first — the events immediately before a crash are
      // the ones that explain it, and they must not be sitting in the
      // coalescing window when the process dies.
      await this.persistNow();
      await AsyncStorage.setItem(CRASH_KEY, JSON.stringify(payload)).catch(() => {});
    }
    try {
      await this.transport?.sendCrash({
        crash: payload,
        anonymousId: this.anonymousId,
        platform: Platform.OS,
        appVersion: this.appVersion,
      });
      if (payload.level === 'fatal') {
        await AsyncStorage.removeItem(CRASH_KEY).catch(() => {});
      }
    } catch {
      // Left on disk; the next launch retries it.
    }
  }

  /**
   * Install the global JS error handler.
   *
   * The previous handler is always called afterwards, so React Native's own
   * redbox still appears in development and the app still terminates as it
   * would have. Crash reporting must observe, not change, what happens.
   */
  installGlobalHandler() {
    const globalAny = global as any;
    const errorUtils = globalAny.ErrorUtils;
    if (!errorUtils?.getGlobalHandler || this.restoreCrashHandler) {
      return;
    }
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      this.reportError(error, {fatal: isFatal !== false}).catch(() => {});
      previous?.(error, isFatal);
    });
    this.restoreCrashHandler = () => errorUtils.setGlobalHandler(previous);
  }

  /** Test/inspection hook. */
  pending(): QueuedEvent[] {
    return [...this.queue];
  }

  currentSessionId(): string {
    return this.sessionId;
  }

  async reset() {
    this.stop();
    this.queue = [];
    this.breadcrumbs = [];
    this.sessionId = uid('s');
    this.flushing = false;
    this.transport = null;
    await AsyncStorage.multiRemove([QUEUE_KEY, CRASH_KEY]).catch(() => {});
  }

  private async loadAnonymousId(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(ANON_KEY);
      if (stored) {
        return stored;
      }
    } catch {
      // Fall through to a fresh id — a session without stitching beats none.
    }
    const created = uid('a');
    await AsyncStorage.setItem(ANON_KEY, created).catch(() => {});
    return created;
  }

  private async restoreQueue() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.queue = parsed.slice(-MAX_QUEUE);
      }
    } catch {
      await AsyncStorage.removeItem(QUEUE_KEY).catch(() => {});
    }
  }

  /**
   * Mirror the queue to storage, coalescing bursts.
   *
   * Writing on every single `track()` put a storage round-trip on the UI path
   * for events that arrive in clusters (a screen transition emits several).
   * The window is short enough that a crash loses at most a few hundred
   * milliseconds of trail — and the fatal-crash path forces a write first, so
   * the trail that explains a crash is never the part that is lost.
   */
  private persistQueue(): void {
    if (this.persistTimer) {
      return;
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.persistNow().catch(() => {});
    }, PERSIST_DEBOUNCE_MS);
  }

  private persistNow(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    return AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue)).catch(() => {});
  }

  /** Send the crash the previous run died on, if there was one. */
  private async reportPendingCrash() {
    try {
      const raw = await AsyncStorage.getItem(CRASH_KEY);
      if (!raw) {
        return;
      }
      const crash = JSON.parse(raw) as CrashPayload;
      await this.transport?.sendCrash({
        crash,
        anonymousId: this.anonymousId,
        platform: Platform.OS,
        appVersion: this.appVersion,
      });
      await AsyncStorage.removeItem(CRASH_KEY);
    } catch {
      // Keep it for the launch after this one.
    }
  }
}

export const telemetry = new Telemetry();
