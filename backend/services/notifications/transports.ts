import { DevicePlatform } from "../../data/yaysNotifications";

/**
 * Push transports.
 *
 * The delivery service talks to this interface only, so the same code path is
 * exercised whether credentials are configured or not. With no credentials the
 * stub records the send and reports success — a fresh checkout runs the whole
 * notification pipeline (preferences, quiet hours, dedupe, inbox, deep links)
 * without a Firebase project, and the only thing missing is the last hop.
 */

export interface PushPayload {
  token: string;
  platform: DevicePlatform;
  title: string;
  body: string;
  /** Merged into the FCM `data` / APNs custom payload — all values are strings. */
  data: Record<string, string>;
  sound: boolean;
  /** Badge count to show on the app icon; omitted when unknown. */
  badge?: number;
}

export interface PushSendResult {
  ok: boolean;
  error?: string;
  /** The token is permanently invalid — the device row should be disabled. */
  tokenGone?: boolean;
}

export interface PushTransport {
  readonly id: string;
  readonly live: boolean;
  send(payload: PushPayload): Promise<PushSendResult>;
}

const INVALID_FCM_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** Must match the channels created by NotificationChannels.kt in the app. */
export const androidChannelFor = (
  payload: Pick<PushPayload, "data" | "sound">
): string => {
  if (!payload.sound) return "yays_silent_v2";
  if (payload.data.type === "call") return "yays_calls_v2";
  switch (payload.data.category) {
    case "messages":
      return "yays_messages_v2";
    case "communities":
      return "yays_communities_v2";
    case "rewards":
      return "yays_rewards_v2";
    default:
      return "yays_events_v2";
  }
};

export const bundledSoundFor = (payload: Pick<PushPayload, "data">): string => {
  if (payload.data.type === "call") return "yays_call";
  switch (payload.data.category) {
    case "messages":
      return "yays_message";
    case "rewards":
      return "yays_reward";
    default:
      return "yays_event";
  }
};

/** Records sends in memory so tests and the admin surface can assert on them. */
export class StubPushTransport implements PushTransport {
  readonly id = "stub";
  readonly live = false;
  readonly sent: PushPayload[] = [];

  async send(payload: PushPayload): Promise<PushSendResult> {
    this.sent.push(payload);
    if (this.sent.length > 200) {
      this.sent.splice(0, this.sent.length - 200);
    }
    return { ok: true };
  }

  reset() {
    this.sent.length = 0;
  }
}

/**
 * Firebase handles both platforms: the iOS app registers its APNs token
 * through the Firebase SDK, so one transport covers ios and android.
 */
export class FirebasePushTransport implements PushTransport {
  readonly id = "firebase";
  readonly live = true;

  async send(payload: PushPayload): Promise<PushSendResult> {
    try {
      // Required lazily: importing the admin SDK initialises an app, which is
      // pointless (and noisy) in the configurations that never reach here.
      const admin = require("../../config/firebase").default;
      await admin.messaging().send({
        token: payload.token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        android: {
          priority: "high",
          notification: {
            channelId: androidChannelFor(payload),
            sound: payload.sound ? bundledSoundFor(payload) : undefined,
            defaultVibrateTimings: payload.sound,
            visibility: "public",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound ? `${bundledSoundFor(payload)}.wav` : undefined,
              badge: payload.badge,
              "content-available": 1,
            },
          },
        },
      });
      return { ok: true };
    } catch (error: any) {
      const code = error?.errorInfo?.code || error?.code;
      return {
        ok: false,
        error: String(code || error?.message || "push_failed"),
        tokenGone: INVALID_FCM_CODES.has(code),
      };
    }
  }
}

const firebaseConfigured = (): boolean =>
  Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );

/**
 * Standards-based Web Push (Milestone 7/8 web client) — a browser has no
 * Firebase SDK the way the native apps do, so a `platform: "web"` device
 * subscribes directly against `PushManager` and the token this stores is the
 * resulting `PushSubscription`, JSON-encoded rather than a bare FCM string.
 * `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are an EC keypair this project owns
 * (not a third-party credential) — see `getConfig` for where the public half
 * reaches the client.
 */
export const webPushConfigured = (): boolean =>
  Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export class WebPushTransport implements PushTransport {
  readonly id = "webpush";
  readonly live = true;

  async send(payload: PushPayload): Promise<PushSendResult> {
    let subscription: any;
    try {
      subscription = JSON.parse(payload.token);
      if (!subscription?.endpoint) throw new Error("no endpoint");
    } catch {
      // Not a device going stale — a row that never held a real subscription.
      return { ok: false, error: "invalid_subscription", tokenGone: true };
    }
    try {
      // Required lazily, same reasoning as the Firebase admin import above:
      // setting VAPID details on import is pointless where this never runs.
      const webpush = require("web-push");
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:support@indexx.ai",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title: payload.title, body: payload.body, data: payload.data })
      );
      return { ok: true };
    } catch (error: any) {
      // 404/410 is the Push service telling us the subscription is dead —
      // the browser was uninstalled, storage was cleared, or it expired.
      const status = error?.statusCode;
      return {
        ok: false,
        error: String(status || error?.message || "webpush_failed"),
        tokenGone: status === 404 || status === 410,
      };
    }
  }
}

/** Dispatches by platform: native devices keep going through Firebase/stub, `web` gets Web Push. */
class CompositePushTransport implements PushTransport {
  readonly id: string;
  readonly live: boolean;

  constructor(private mobile: PushTransport, private web: PushTransport | null) {
    this.id = web ? `${mobile.id}+${web.id}` : mobile.id;
    this.live = mobile.live || Boolean(web?.live);
  }

  send(payload: PushPayload): Promise<PushSendResult> {
    if (payload.platform === "web") {
      // Deliberately not falling back to the mobile transport: a JSON-encoded
      // PushSubscription sent to Firebase as an FCM token would just fail
      // loudly (or worse, get misread as a dead token and disable the row).
      return this.web
        ? this.web.send(payload)
        : Promise.resolve({ ok: false, error: "webpush_not_configured" });
    }
    return this.mobile.send(payload);
  }
}

let cached: PushTransport | null = null;

/**
 * Resolve the transport once per process. `YAYS_PUSH_TRANSPORT=stub` forces the
 * stub even where Firebase (or a VAPID keypair) is configured, which is how
 * staging avoids waking real devices — real browsers subscribed to real Web
 * Push notifications are exactly as real a device as a phone here, so the
 * same flag has to cover both rather than only the one it was named after.
 */
export const pushTransport = (): PushTransport => {
  if (cached) {
    return cached;
  }
  const forced = String(process.env.YAYS_PUSH_TRANSPORT || "").toLowerCase();
  let mobile: PushTransport;
  if (forced === "stub") {
    mobile = new StubPushTransport();
  } else if (forced === "firebase" || firebaseConfigured()) {
    mobile = new FirebasePushTransport();
  } else {
    mobile = new StubPushTransport();
  }
  // A forced stub still reports as "web push is on" (unlike the unconfigured
  // case, which correctly reports `webpush_not_configured`) — it is on, just
  // pointed at the stub instead of a real push service, the same distinction
  // `mobile` already draws.
  const web = !webPushConfigured() ? null : forced === "stub" ? new StubPushTransport() : new WebPushTransport();
  cached = new CompositePushTransport(mobile, web);
  return cached;
};

/** Test hook — drops the cached transport and any recorded sends. */
export const resetPushTransport = (transport?: PushTransport) => {
  cached = transport ?? null;
};

export const pushTransportStatus = () => {
  const transport = pushTransport();
  return {
    id: transport.id,
    live: transport.live,
    note: transport.live
      ? "Push notifications are delivered to real devices."
      : "No push credentials configured — notifications reach the in-app inbox only.",
  };
};
