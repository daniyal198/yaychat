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
  callCapabilities,
  callConfigFor,
  callsEnabled,
  iceServersFor,
  relayConfigured,
} from "../../services/calls/iceServers";
import { __resetTwilioIceCache, twilioTurnConfigured } from "../../services/calls/twilioIce";

const withEnv = async (
  vars: Record<string, string | undefined>,
  run: () => void | Promise<void>
) => {
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
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    __resetTwilioIceCache();
  }
};

const clearTurn = {
  YAYS_TURN_URLS: undefined,
  YAYS_TURN_SECRET: undefined,
  YAYS_TURN_USERNAME: undefined,
  YAYS_TURN_PASSWORD: undefined,
  YAYS_STUN_URLS: undefined,
  // Off by default in tests: these cases cover the self-hosted relay, and no
  // unit test should reach out to Twilio.
  YAYS_TWILIO_TURN_ENABLED: undefined,
};

describe("ICE servers", () => {
  it("always offers STUN so calls work out of the box", async () => {
    await withEnv(clearTurn, async () => {
      const servers = await iceServersFor("ana@example.com");
      assert.strictEqual(servers.length, 1);
      assert.ok(String(servers[0].urls).includes("stun:"));
      assert.strictEqual(servers[0].credential, undefined);
    });
  });

  it("honours configured STUN urls", async () => {
    await withEnv(
      { ...clearTurn, YAYS_STUN_URLS: "stun:one.example:3478,stun:two.example:3478" },
      async () => {
        const servers = await iceServersFor("ana@example.com");
        assert.deepStrictEqual(servers[0].urls, [
          "stun:one.example:3478",
          "stun:two.example:3478",
        ]);
      }
    );
  });

  it("derives an ephemeral TURN credential and never ships the secret", async () => {
    await withEnv(
      {
        ...clearTurn,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_SECRET: "super-secret",
      },
      async () => {
        const servers = await iceServersFor("ana@example.com");
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

  it("gives two users different credentials", async () => {
    await withEnv(
      {
        ...clearTurn,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_SECRET: "super-secret",
      },
      async () => {
        const ana = (await iceServersFor("ana@example.com"))[1];
        const ben = (await iceServersFor("ben@example.com"))[1];
        assert.notStrictEqual(ana.credential, ben.credential);
      }
    );
  });

  it("supports static TURN credentials for smaller deployments", async () => {
    await withEnv(
      {
        ...clearTurn,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_USERNAME: "relay-user",
        YAYS_TURN_PASSWORD: "relay-pass",
      },
      async () => {
        const turn = (await iceServersFor("ana@example.com"))[1];
        assert.strictEqual(turn.username, "relay-user");
        assert.strictEqual(turn.credential, "relay-pass");
      }
    );
  });

  it("omits TURN entirely when urls are set but no credentials are", async () => {
    await withEnv({ ...clearTurn, YAYS_TURN_URLS: "turn:relay.example:3478" }, async () => {
      // Offering a relay a client cannot authenticate to would make every
      // restricted-NAT call fail slowly instead of falling back to STUN.
      assert.strictEqual((await iceServersFor("ana@example.com")).length, 1);
      assert.strictEqual(relayConfigured(), false);
    });
  });
});

describe("Twilio relay", () => {
  const twilioEnv = {
    ...clearTurn,
    YAYS_TWILIO_TURN_ENABLED: "true",
    TWILIO_ACCOUNT_SID: "ACtest",
    TWILIO_AUTH_TOKEN: "token",
  };

  it("is opt-in, so configuring SMS does not silently start billing relay", async () => {
    // The same Twilio account is already used for SMS OTP. Credentials alone
    // must not turn on per-gigabyte relayed media.
    await withEnv(
      { ...clearTurn, TWILIO_ACCOUNT_SID: "ACtest", TWILIO_AUTH_TOKEN: "token" },
      () => {
        assert.strictEqual(twilioTurnConfigured(), false);
        assert.strictEqual(relayConfigured(), false);
      }
    );
  });

  it("needs credentials, not just the flag", async () => {
    await withEnv(
      { ...clearTurn, YAYS_TWILIO_TURN_ENABLED: "true", TWILIO_ACCOUNT_SID: undefined, TWILIO_AUTH_TOKEN: undefined },
      () => {
        assert.strictEqual(twilioTurnConfigured(), false);
      }
    );
  });

  it("counts as a configured relay once enabled", async () => {
    await withEnv(twilioEnv, () => {
      assert.strictEqual(twilioTurnConfigured(), true);
      assert.strictEqual(relayConfigured(), true);
    });
  });

  it("prefers a self-hosted relay over Twilio when both are configured", async () => {
    await withEnv(
      {
        ...twilioEnv,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_SECRET: "super-secret",
      },
      async () => {
        const servers = await iceServersFor("ana@example.com");
        // Self-hosted relayed minutes cost a fraction of a managed service, so
        // Twilio is the fallback rather than an addition — and no Twilio call
        // is made here at all.
        assert.strictEqual(servers.length, 2);
        assert.deepStrictEqual(servers[1].urls, ["turn:relay.example:3478"]);
      }
    );
  });
});

describe("call config", () => {
  it("reports the relay gap rather than hiding it", async () => {
    await withEnv(clearTurn, async () => {
      const config = await callConfigFor("ana@example.com");
      // Roughly 10–20% of real calls need a relay. An operator has to be able
      // to see that those will fail.
      assert.strictEqual(config.relayConfigured, false);
      assert.ok(config.ringTimeoutSeconds > 0);
    });
  });

  it("answers the public capability check without minting a credential", async () => {
    await withEnv(
      {
        ...clearTurn,
        YAYS_TURN_URLS: "turn:relay.example:3478",
        YAYS_TURN_SECRET: "super-secret",
      },
      () => {
        // The capability endpoint is unauthenticated; handing an anonymous
        // caller relay credentials would be giving away billable bandwidth.
        const capabilities = callCapabilities() as Record<string, unknown>;
        assert.strictEqual(capabilities.relayConfigured, true);
        assert.strictEqual(capabilities.iceServers, undefined);
      }
    );
  });

  it("is on by default and can be switched off", async () => {
    await withEnv({ YAYS_CALLS_ENABLED: undefined }, () => {
      assert.strictEqual(callsEnabled(), true);
    });
    await withEnv({ ...clearTurn, YAYS_CALLS_ENABLED: "false" }, async () => {
      assert.strictEqual(callsEnabled(), false);
      assert.strictEqual((await callConfigFor("ana@example.com")).enabled, false);
    });
    await withEnv({ YAYS_CALLS_ENABLED: "true" }, () => {
      assert.strictEqual(callsEnabled(), true);
    });
  });
});
