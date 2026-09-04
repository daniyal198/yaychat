/**
 * Web Push transport (Milestone 8 — yaysapp-web).
 *
 * The real send-and-receive path (subscribe in a real browser, deliver
 * through Google's push service, land in the service worker) was verified
 * end to end against a real VAPID keypair while building this — not
 * reproducible here without a network call to a real push endpoint. What is
 * unit-testable, and what actually matters to get right without a network:
 * capability detection, and that a bad subscription or a missing keypair
 * fails *without* falling through to the Firebase/stub transport meant for
 * ios/android — see `CompositePushTransport` in transports.ts for why that
 * fallback would be actively wrong (a JSON PushSubscription is not an FCM token).
 */
import assert from "assert";
import {
  pushTransport,
  resetPushTransport,
  StubPushTransport,
  webPushConfigured,
  WebPushTransport,
} from "../../services/notifications/transports";

const withEnv = async (
  vars: Record<string, string | undefined>,
  run: () => void | Promise<void>
) => {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetPushTransport();
  }
};

const clearVapid = { VAPID_PUBLIC_KEY: undefined, VAPID_PRIVATE_KEY: undefined };

describe("webPushConfigured", () => {
  it("is false with no VAPID keys", async () => {
    await withEnv(clearVapid, () => {
      assert.strictEqual(webPushConfigured(), false);
    });
  });

  it("is false with only one of the two keys", async () => {
    await withEnv({ ...clearVapid, VAPID_PUBLIC_KEY: "pub-only" }, () => {
      assert.strictEqual(webPushConfigured(), false);
    });
  });

  it("is true once both keys are set", async () => {
    await withEnv({ VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv" }, () => {
      assert.strictEqual(webPushConfigured(), true);
    });
  });
});

describe("WebPushTransport", () => {
  it("fails fast on a token that is not a JSON PushSubscription, without a network call", async () => {
    const transport = new WebPushTransport();
    const result = await transport.send({
      token: "not-json",
      platform: "web",
      title: "Test",
      body: "Test",
      data: {},
      sound: true,
    });
    assert.strictEqual(result.ok, false);
    // Disabling the row immediately is correct here: this is not a device
    // that used to work and stopped, it never held a real subscription.
    assert.strictEqual(result.tokenGone, true);
  });

  it("fails fast on valid JSON with no endpoint", async () => {
    const transport = new WebPushTransport();
    const result = await transport.send({
      token: JSON.stringify({ keys: { p256dh: "x", auth: "y" } }),
      platform: "web",
      title: "Test",
      body: "Test",
      data: {},
      sound: true,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.tokenGone, true);
  });
});

describe("pushTransport() dispatch", () => {
  it("reports a web device as unsendable rather than routing it to the mobile transport when VAPID is unset", async () => {
    await withEnv(
      { ...clearVapid, YAYS_PUSH_TRANSPORT: "stub" },
      async () => {
        const transport = pushTransport();
        const result = await transport.send({
          token: "irrelevant",
          platform: "web",
          title: "t",
          body: "b",
          data: {},
          sound: true,
        });
        assert.strictEqual(result.ok, false);
        assert.strictEqual(result.error, "webpush_not_configured");
      }
    );
  });

  it("still sends ios/android through the mobile transport when VAPID is unset", async () => {
    await withEnv(
      { ...clearVapid, YAYS_PUSH_TRANSPORT: "stub" },
      async () => {
        const transport = pushTransport();
        const result = await transport.send({
          token: "device-token",
          platform: "ios",
          title: "t",
          body: "b",
          data: {},
          sound: true,
        });
        assert.strictEqual(result.ok, true);
      }
    );
  });

  it("routes a web device to Web Push once VAPID is configured, leaving ios/android on the mobile transport", async () => {
    await withEnv(
      {
        VAPID_PUBLIC_KEY: "pub",
        VAPID_PRIVATE_KEY: "priv",
        // Left unforced, and Firebase is not configured in this test env
        // either, so the mobile side naturally resolves to StubPushTransport
        // — this isolates "did VAPID route web to a real WebPushTransport"
        // from the separate `YAYS_PUSH_TRANSPORT=stub` behaviour below.
      },
      async () => {
        const transport = pushTransport();
        // A malformed token proves *which* transport handled it: the stub
        // transport always reports ok:true, so ok:false + tokenGone:true can
        // only mean this reached WebPushTransport's parse check.
        const web = await transport.send({
          token: "not-json",
          platform: "web",
          title: "t",
          body: "b",
          data: {},
          sound: true,
        });
        assert.strictEqual(web.ok, false);
        assert.strictEqual(web.tokenGone, true);

        const mobile = await transport.send({
          token: "device-token",
          platform: "android",
          title: "t",
          body: "b",
          data: {},
          sound: true,
        });
        assert.strictEqual(mobile.ok, true);
      }
    );
  });

  it("YAYS_PUSH_TRANSPORT=stub also stubs web push rather than only the mobile side", async () => {
    await withEnv(
      { VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", YAYS_PUSH_TRANSPORT: "stub" },
      async () => {
        const transport = pushTransport();
        // The stub transport doesn't parse the token at all, so even a
        // malformed one reports ok:true here — the opposite of the previous
        // test, which is exactly the point: a staging deploy with real VAPID
        // keys must not wake a real subscriber's browser either.
        const result = await transport.send({
          token: "not-json",
          platform: "web",
          title: "t",
          body: "b",
          data: {},
          sound: true,
        });
        assert.strictEqual(result.ok, true);
      }
    );
  });
});

// Guards against the exported test double silently drifting from the real
// interface it stands in for.
describe("StubPushTransport", () => {
  it("records every send and always reports success", async () => {
    const stub = new StubPushTransport();
    await stub.send({ token: "a", platform: "web", title: "t", body: "b", data: {}, sound: true });
    assert.strictEqual(stub.sent.length, 1);
  });
});
