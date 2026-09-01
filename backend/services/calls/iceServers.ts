import crypto from "crypto";
import { CallConfig, IceServer } from "../../data/yaysCalls";
import { RING_TIMEOUT_SECONDS } from "../yaysCall.service";
import { twilioIceServers, twilioTurnConfigured } from "./twilioIce";

/**
 * ICE server configuration for WebRTC.
 *
 * STUN alone gets a call connected between most home networks. TURN is what
 * makes calls work on carrier-grade NAT and restrictive corporate Wi-Fi —
 * roughly 10–20% of real calls — by relaying the media. Without a TURN server
 * those calls simply fail to connect, so `relayConfigured` is reported to the
 * client rather than hidden: an operator needs to know that gap exists.
 *
 * A relay can come from either of two places, in this order:
 *
 *  1. **Self-hosted** (`YAYS_TURN_URLS`) — preferred at scale, since relayed
 *     minutes on your own coturn cost a fraction of a managed service.
 *  2. **Twilio Network Traversal** — no server to run, billed per gigabyte.
 *     Used when self-hosted TURN is not configured.
 *
 * Self-hosted TURN credentials use the standard ephemeral scheme (as
 * implemented by coturn's `use-auth-secret`): the username is an expiry
 * timestamp and the password is an HMAC of it under a shared secret. The
 * long-lived secret therefore never ships inside the app, and a credential
 * lifted off a device stops working within the hour. Twilio's own credentials
 * are short-lived by the same reasoning.
 */

const TURN_CREDENTIAL_TTL_SECONDS = 60 * 60;

const list = (value: string | undefined): string[] =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

/** Public STUN fallback so calls still work out of the box in development. */
const DEFAULT_STUN = ["stun:stun.l.google.com:19302"];

const turnCredentials = (
  secret: string,
  userLower: string
): { username: string; credential: string } => {
  const expiry = Math.floor(Date.now() / 1000) + TURN_CREDENTIAL_TTL_SECONDS;
  const username = `${expiry}:${userLower}`;
  const credential = crypto
    .createHmac("sha1", secret)
    .update(username)
    .digest("base64");
  return { username, credential };
};

/** Whether a self-hosted relay is fully configured — urls *and* credentials. */
const selfHostedTurnConfigured = (): boolean =>
  list(process.env.YAYS_TURN_URLS).length > 0 &&
  Boolean(
    String(process.env.YAYS_TURN_SECRET || "").trim() ||
      (String(process.env.YAYS_TURN_USERNAME || "").trim() &&
        String(process.env.YAYS_TURN_PASSWORD || "").trim())
  );

/** The self-hosted relay entry, or null when it is not fully configured. */
const selfHostedTurn = (userLower: string): IceServer | null => {
  const turnUrls = list(process.env.YAYS_TURN_URLS);
  if (!turnUrls.length) {
    return null;
  }
  const secret = String(process.env.YAYS_TURN_SECRET || "").trim();
  const staticUser = String(process.env.YAYS_TURN_USERNAME || "").trim();
  const staticPassword = String(process.env.YAYS_TURN_PASSWORD || "").trim();

  if (secret) {
    return { urls: turnUrls, ...turnCredentials(secret, userLower) };
  }
  if (staticUser && staticPassword) {
    // Static credentials work but are shared by every user and never expire.
    // Supported for smaller TURN deployments; prefer the HMAC secret.
    return { urls: turnUrls, username: staticUser, credential: staticPassword };
  }
  // Offering a relay the client cannot authenticate to would make every
  // restricted-NAT call fail slowly instead of falling back to STUN.
  return null;
};

export const iceServersFor = async (userLower: string): Promise<IceServer[]> => {
  const stunUrls = list(process.env.YAYS_STUN_URLS);
  const servers: IceServer[] = [
    { urls: stunUrls.length ? stunUrls : DEFAULT_STUN },
  ];

  const selfHosted = selfHostedTurn(userLower);
  if (selfHosted) {
    servers.push(selfHosted);
    return servers;
  }

  // Only reached when there is no self-hosted relay to prefer. Returns null on
  // any Twilio problem, leaving STUN-only ICE rather than a failed call setup.
  const twilio = await twilioIceServers();
  if (twilio?.length) {
    servers.push(...twilio);
  }
  return servers;
};

export const relayConfigured = (): boolean =>
  selfHostedTurnConfigured() || twilioTurnConfigured();

/**
 * Whether calling is offered at all.
 *
 * Defaults to on: STUN alone connects the majority of calls, and an operator
 * who wants calling dark can set `YAYS_CALLS_ENABLED=false`.
 */
export const callsEnabled = (): boolean =>
  String(process.env.YAYS_CALLS_ENABLED ?? "true").toLowerCase() !== "false";

/**
 * Capabilities without credentials.
 *
 * Split out from `callConfigFor` so the public, unauthenticated capability
 * endpoint can answer "can I call?" without minting a relay credential — that
 * would hand an anonymous caller billable relay bandwidth.
 */
export const callCapabilities = (): Omit<CallConfig, "iceServers"> => ({
  enabled: callsEnabled(),
  ringTimeoutSeconds: RING_TIMEOUT_SECONDS,
  relayConfigured: relayConfigured(),
});

export const callConfigFor = async (userLower: string): Promise<CallConfig> => ({
  ...callCapabilities(),
  iceServers: await iceServersFor(userLower),
});
