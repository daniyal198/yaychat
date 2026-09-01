import { Twilio } from "twilio";
import { IceServer } from "../../data/yaysCalls";

/**
 * TURN relay via Twilio's Network Traversal Service.
 *
 * The self-hosted coturn path in `iceServers.ts` stays the preferred option at
 * scale — relayed minutes are markedly cheaper on your own box. This exists so
 * a deployment that has no TURN server of its own still connects the 10–20% of
 * calls that sit behind carrier-grade NAT or restrictive corporate Wi-Fi, which
 * STUN alone cannot reach. Twilio hands back a relay on 443/TCP, which is the
 * entry that survives the strictest firewalls.
 *
 * Two deliberate choices:
 *
 *  - **Fail soft.** If Twilio is slow or down, callers get STUN-only ICE rather
 *    than an error. A degraded call that connects for most people beats a hard
 *    failure for everyone, and `relayConfigured` still advertises the intent.
 *  - **One cached token, not one per call.** Twilio mints ephemeral credentials
 *    per request; fetching per call would add an HTTP round-trip to every call
 *    setup and burn rate limit for no security gain worth the latency. The
 *    token is short-lived and refreshed well before expiry, so a credential
 *    lifted off a device stops relaying within the hour. The trade-off is that
 *    users within one refresh window share a credential — acceptable because it
 *    expires quickly and grants nothing but relay bandwidth.
 */

/** Credential lifetime requested from Twilio. Matches the coturn path. */
const TOKEN_TTL_SECONDS = 60 * 60;

/** Refresh this far before expiry so a call never picks up a dead credential. */
const REFRESH_MARGIN_SECONDS = 5 * 60;

/** Don't let a hung Twilio call stall call setup. */
const FETCH_TIMEOUT_MS = 4000;

interface CachedToken {
  servers: IceServer[];
  expiresAtMs: number;
}

let cached: CachedToken | null = null;
/** In-flight fetch, so concurrent call setups share one request. */
let inFlight: Promise<IceServer[] | null> | null = null;
let client: Twilio | null = null;
/** Throttles the error log so an outage cannot flood the log with one line per call. */
let lastFailureLoggedMs = 0;

const env = (key: string): string => String(process.env[key] || "").trim();

/**
 * Whether Twilio should be used as the relay.
 *
 * Opt-in rather than implied by the presence of Twilio credentials: the same
 * account is already used for SMS OTP, and relayed media is billed per
 * gigabyte. Turning that on should be a decision, not a side effect of
 * configuring SMS.
 */
export const twilioTurnConfigured = (): boolean =>
  env("YAYS_TWILIO_TURN_ENABLED").toLowerCase() === "true" &&
  Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN"));

const twilioClient = (): Twilio | null => {
  if (!twilioTurnConfigured()) {
    return null;
  }
  if (!client) {
    client = new Twilio(env("TWILIO_ACCOUNT_SID"), env("TWILIO_AUTH_TOKEN"));
  }
  return client;
};

/**
 * Twilio returns each server with both a deprecated `url` and the standard
 * `urls`. Passing the extra key through to `RTCPeerConnection` is harmless on
 * some clients and rejected outright by others, so the shape is normalised to
 * exactly what WebRTC expects.
 */
const normalise = (raw: any): IceServer | null => {
  const urls = String(raw?.urls || raw?.url || "").trim();
  if (!urls) {
    return null;
  }
  const server: IceServer = { urls };
  if (raw?.username) {
    server.username = String(raw.username);
  }
  if (raw?.credential) {
    server.credential = String(raw.credential);
  }
  return server;
};

const fetchToken = async (): Promise<IceServer[] | null> => {
  const twilio = twilioClient();
  if (!twilio) {
    return null;
  }
  try {
    const token: any = await Promise.race([
      twilio.tokens.create({ ttl: TOKEN_TTL_SECONDS }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("twilio ice timeout")), FETCH_TIMEOUT_MS)
      ),
    ]);

    const servers = (token?.iceServers || [])
      .map(normalise)
      .filter((entry: IceServer | null): entry is IceServer => Boolean(entry));

    if (!servers.length) {
      return null;
    }

    cached = {
      servers,
      expiresAtMs: Date.now() + (TOKEN_TTL_SECONDS - REFRESH_MARGIN_SECONDS) * 1000,
    };
    return servers;
  } catch (error) {
    // Throttled: an outage would otherwise log once per call setup.
    if (Date.now() - lastFailureLoggedMs > 60_000) {
      lastFailureLoggedMs = Date.now();
      console.error("[yays/calls] Twilio ICE unavailable, falling back to STUN", error);
    }
    return null;
  }
};

/**
 * Relay servers for one client, or null when Twilio is off or unreachable.
 *
 * Serves the cached token while it is fresh; otherwise fetches, with concurrent
 * callers sharing a single in-flight request.
 */
export const twilioIceServers = async (): Promise<IceServer[] | null> => {
  if (!twilioTurnConfigured()) {
    return null;
  }
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.servers;
  }
  if (!inFlight) {
    inFlight = fetchToken().finally(() => {
      inFlight = null;
    });
  }
  const servers = await inFlight;
  // A failed refresh still has a usable, not-yet-expired token in hand more
  // often than not — prefer it over dropping to STUN.
  if (!servers && cached && cached.expiresAtMs + REFRESH_MARGIN_SECONDS * 1000 > Date.now()) {
    return cached.servers;
  }
  return servers;
};

/** Test seam. */
export const __resetTwilioIceCache = () => {
  cached = null;
  inFlight = null;
  client = null;
  lastFailureLoggedMs = 0;
};
