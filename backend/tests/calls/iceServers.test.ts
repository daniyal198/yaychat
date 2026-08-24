/**
 * Call configuration — ICE servers and TURN credentials.
 *
 * The security property under test: the long-lived TURN secret must never be
 * handed to a client. Clients get a short-lived HMAC credential derived from
 * it, so a credential lifted off a device stops relaying within the hour
 * instead of billing your TURN server indefinitely.
 */
import assert from "assert";
import crypto from "crypto";
import {
  callConfigFor,
  callsEnabled,
  iceServersFor,
  relayConfigured,
} from "../../services/calls/iceServers";

const withEnv = (vars: Record<string, string | undefined>, run: () => void) => {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
};

const clearTurn = {
  YAYS_TURN_URLS: undefined,
  YAYS_TURN_SECRET: undefined,
  YAYS_TURN_USERNAME: undefined,
  YAYS_TURN_PASSWORD: undefined,
  YAYS_STUN_URLS: undefined,
};

describe("ICE servers", () => {
  it("always offers STUN so calls work out of the box", () => {
    withEnv(clearTurn, () => {
      const servers = iceServersFor("ana@example.com");
      assert.strictEqual(servers.length, 1);
      assert.ok(String(servers[0].urls).includes("stun:"));
      assert.strictEqual(servers[0].credential, undefined);
    });
  });

  it("honours configured STUN urls", () => {
    withEnv({ ...clearTurn, YAYS_STUN_URLS: "stun:one.example:3478,stun:two.example:3478" }, () => {
      const servers = iceServersFor("ana@example.com");
      assert.deepStrictEqual(servers[0].urls, [
        "stun:one.example:3478",
        "stun:two.example:3478",
      ]);
    });
  });

  it("derives an ephemeral TURN credential and never ships the secret", () => {
    withEnv(
      {
        ...clearTurn,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_SECRET: "super-secret",
      },
      () => {
        const servers = iceServersFor("ana@example.com");
        const turn = servers[1];
        assert.ok(turn, "a TURN server should be offered");

        // Username is `<expiry>:<user>`, expiring within the hour.
        const [expiry, user] = String(turn.username).split(":");
        assert.strictEqual(user, "ana@example.com");
        const secondsAhead = Number(expiry) - Math.floor(Date.now() / 1000);
        assert.ok(secondsAhead > 0 && secondsAhead <= 3600);

        // Credential is the HMAC of the username, so the secret stays server-side.
        const expected = crypto
          .createHmac("sha1", "super-secret")
          .update(String(turn.username))
          .digest("base64");
        assert.strictEqual(turn.credential, expected);

        const serialised = JSON.stringify(servers);
        assert.ok(!serialised.includes("super-secret"));
      }
    );
  });

  it("gives two users different credentials", () => {
    withEnv(
      {
        ...clearTurn,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_SECRET: "super-secret",
      },
      () => {
        const ana = iceServersFor("ana@example.com")[1];
        const ben = iceServersFor("ben@example.com")[1];
        assert.notStrictEqual(ana.credential, ben.credential);
      }
    );
  });

  it("supports static TURN credentials for smaller deployments", () => {
    withEnv(
      {
        ...clearTurn,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_USERNAME: "relay-user",
        YAYS_TURN_PASSWORD: "relay-pass",
      },
      () => {
        const turn = iceServersFor("ana@example.com")[1];
        assert.strictEqual(turn.username, "relay-user");
        assert.strictEqual(turn.credential, "relay-pass");
      }
    );
  });

  it("omits TURN entirely when urls are set but no credentials are", () => {
    withEnv({ ...clearTurn, YAYS_TURN_URLS: "turn:relay.example:3478" }, () => {
      // Offering a relay a client cannot authenticate to would make every
      // restricted-NAT call fail slowly instead of falling back to STUN.
      assert.strictEqual(iceServersFor("ana@example.com").length, 1);
      assert.strictEqual(relayConfigured(), false);
    });
  });
});

describe("call config", () => {
  it("reports the relay gap rather than hiding it", () => {
    withEnv(clearTurn, () => {
      const config = callConfigFor("ana@example.com");
      // Roughly 10–20% of real calls need a relay. An operator has to be able
      // to see that those will fail.
      assert.strictEqual(config.relayConfigured, false);
      assert.ok(config.ringTimeoutSeconds > 0);
    });
  });

  it("is on by default and can be switched off", () => {
    withEnv({ YAYS_CALLS_ENABLED: undefined }, () => {
      assert.strictEqual(callsEnabled(), true);
    });
    withEnv({ YAYS_CALLS_ENABLED: "false" }, () => {
      assert.strictEqual(callsEnabled(), false);
      assert.strictEqual(callConfigFor("ana@example.com").enabled, false);
    });
    withEnv({ YAYS_CALLS_ENABLED: "true" }, () => {
      assert.strictEqual(callsEnabled(), true);
    });
  });
});
