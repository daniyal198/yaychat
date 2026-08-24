/**
 * Module 6 — notification delivery rules.
 *
 * Covers the parts that decide whether a person's phone lights up: the gate
 * ordering, quiet-hours arithmetic across time zones and midnight, the
 * deep-link registry, and the transport selection. All pure — no database.
 */
import assert from "assert";
import {
  buildDeepLink,
  conversationDeepLink,
  directConversationId,
  groupConversationId,
  isDeepLinkRoute,
  knownRoutes,
  webUrlFor,
} from "../../services/notifications/deepLinks";
import {
  categoryEnabled,
  inQuietHours,
} from "../../services/notificationPreference.service";
import { suppressionFor } from "../../services/notificationDelivery.service";
import {
  StubPushTransport,
  pushTransport,
  resetPushTransport,
} from "../../services/notifications/transports";
import { NotificationPreference } from "../../data/yaysNotifications";

const preference = (
  overrides: Partial<NotificationPreference> = {}
): NotificationPreference =>
  ({
    userLower: "ana@example.com",
    messages: true,
    communities: true,
    rewards: true,
    system: true,
    sounds: true,
    previewText: true,
    quietHours: {
      enabled: false,
      startMinute: 22 * 60,
      endMinute: 7 * 60,
      utcOffsetMinutes: 0,
    },
    mutedConversationIds: [],
    ...overrides,
  } as NotificationPreference);

const utc = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 7, 15, hour, minute, 0));

describe("M6 deep-link registry", () => {
  it("builds a conversation link from a conversation id", () => {
    const link = conversationDeepLink("dm:ben@example.com");
    assert.ok(link);
    assert.strictEqual(link!.route, "chat.conversation");
    assert.strictEqual(link!.url, "yaychat://chat/dm%3Aben%40example.com");
  });

  it("refuses a known route with a missing required param", () => {
    assert.strictEqual(buildDeepLink("chat.conversation", {}), null);
    assert.strictEqual(buildDeepLink("community.detail", { communityId: "  " }), null);
  });

  it("refuses an unknown route rather than guessing a destination", () => {
    assert.strictEqual(buildDeepLink("wallet.send", { amount: "10" }), null);
    assert.strictEqual(isDeepLinkRoute("wallet.send"), false);
  });

  it("builds param-free routes", () => {
    const link = buildDeepLink("rewards.home");
    assert.strictEqual(link!.url, "yaychat://earn");
  });

  it("gives every declared route an https twin", () => {
    for (const route of knownRoutes()) {
      // Every param any route declares. A route added without extending this
      // bag fails here, which is the point: the registry and the client's
      // route table have to stay in step or a notification tap opens nothing.
      const link = buildDeepLink(route, {
        conversationId: "dm:ben@example.com",
        communityId: "c1",
        ticketId: "t1",
        callId: "call-1",
      });
      assert.ok(link, `route ${route} should build`);
      assert.ok(webUrlFor(link!).startsWith("http"));
    }
  });

  it("namespaces direct and group conversation ids the way the client does", () => {
    assert.strictEqual(directConversationId("  Ben@Example.com "), "dm:ben@example.com");
    assert.strictEqual(groupConversationId("g42"), "group:g42");
  });
});

describe("M6 quiet hours", () => {
  it("is inactive when disabled", () => {
    assert.strictEqual(inQuietHours(preference().quietHours, utc(3)), false);
  });

  it("covers a window that wraps past midnight", () => {
    const quiet = preference({
      quietHours: { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60, utcOffsetMinutes: 0 },
    }).quietHours;
    assert.strictEqual(inQuietHours(quiet, utc(23)), true);
    assert.strictEqual(inQuietHours(quiet, utc(3)), true);
    assert.strictEqual(inQuietHours(quiet, utc(6, 59)), true);
    assert.strictEqual(inQuietHours(quiet, utc(7)), false);
    assert.strictEqual(inQuietHours(quiet, utc(12)), false);
  });

  it("covers a same-day window", () => {
    const quiet = preference({
      quietHours: { enabled: true, startMinute: 9 * 60, endMinute: 17 * 60, utcOffsetMinutes: 0 },
    }).quietHours;
    assert.strictEqual(inQuietHours(quiet, utc(12)), true);
    assert.strictEqual(inQuietHours(quiet, utc(8)), false);
    assert.strictEqual(inQuietHours(quiet, utc(17)), false);
  });

  // The window follows the user, not the server: 23:00 UTC is 04:30 in IST.
  it("applies the device's UTC offset", () => {
    const quiet = preference({
      quietHours: {
        enabled: true,
        startMinute: 22 * 60,
        endMinute: 7 * 60,
        utcOffsetMinutes: 330,
      },
    }).quietHours;
    assert.strictEqual(inQuietHours(quiet, utc(23)), true);
    // 08:00 UTC is 13:30 local — outside the window even though it is inside
    // the same window read as UTC.
    assert.strictEqual(inQuietHours(quiet, utc(8)), false);
  });

  it("treats an empty window as no window", () => {
    const quiet = preference({
      quietHours: { enabled: true, startMinute: 600, endMinute: 600, utcOffsetMinutes: 0 },
    }).quietHours;
    assert.strictEqual(inQuietHours(quiet, utc(10)), false);
  });
});

describe("M6 delivery gates", () => {
  it("sends when nothing suppresses it", () => {
    assert.strictEqual(
      suppressionFor({ category: "messages" }, preference(), utc(12)),
      null
    );
  });

  it("suppresses a category the user switched off", () => {
    assert.strictEqual(
      suppressionFor({ category: "rewards" }, preference({ rewards: false }), utc(12)),
      "preference_off"
    );
  });

  it("suppresses during quiet hours", () => {
    const p = preference({
      quietHours: { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60, utcOffsetMinutes: 0 },
    });
    assert.strictEqual(suppressionFor({ category: "messages" }, p, utc(2)), "quiet_hours");
  });

  it("lets a critical notice through quiet hours and a category switch", () => {
    const p = preference({
      system: false,
      quietHours: { enabled: true, startMinute: 22 * 60, endMinute: 7 * 60, utcOffsetMinutes: 0 },
    });
    assert.strictEqual(
      suppressionFor({ category: "system", critical: true }, p, utc(2)),
      null
    );
  });

  // Mute is the most explicit instruction a user can give, so it has to
  // outrank the `critical` escape hatch.
  it("keeps a muted conversation silent even for a critical notice", () => {
    const p = preference({ mutedConversationIds: ["dm:ben@example.com"] });
    assert.strictEqual(
      suppressionFor(
        { category: "messages", critical: true, conversationId: "dm:ben@example.com" },
        p,
        utc(12)
      ),
      "muted"
    );
  });

  it("does not mute a different conversation", () => {
    const p = preference({ mutedConversationIds: ["dm:ben@example.com"] });
    assert.strictEqual(
      suppressionFor(
        { category: "messages", conversationId: "dm:cara@example.com" },
        p,
        utc(12)
      ),
      null
    );
  });

  it("treats an unknown category as enabled rather than silently dropping it", () => {
    assert.strictEqual(categoryEnabled(preference(), "promotions" as any), true);
  });
});

describe("M6 push transport", () => {
  afterEach(() => {
    resetPushTransport();
    delete process.env.YAYS_PUSH_TRANSPORT;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  it("falls back to the stub with no credentials, so a fresh checkout works", () => {
    resetPushTransport();
    const transport = pushTransport();
    assert.strictEqual(transport.id, "stub");
    assert.strictEqual(transport.live, false);
  });

  it("selects Firebase once all three credentials are present", () => {
    process.env.FIREBASE_PROJECT_ID = "p";
    process.env.FIREBASE_CLIENT_EMAIL = "e";
    process.env.FIREBASE_PRIVATE_KEY = "k";
    resetPushTransport();
    assert.strictEqual(pushTransport().id, "firebase");
  });

  // Staging sets this so test traffic cannot wake real devices.
  it("honours a forced stub even when Firebase is configured", () => {
    process.env.FIREBASE_PROJECT_ID = "p";
    process.env.FIREBASE_CLIENT_EMAIL = "e";
    process.env.FIREBASE_PRIVATE_KEY = "k";
    process.env.YAYS_PUSH_TRANSPORT = "stub";
    resetPushTransport();
    assert.strictEqual(pushTransport().id, "stub");
  });

  it("records what the stub was asked to send", async () => {
    const stub = new StubPushTransport();
    const result = await stub.send({
      token: "t1",
      platform: "ios",
      title: "Ana",
      body: "hi",
      data: { type: "chat_message" },
      sound: true,
    });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(stub.sent.length, 1);
    assert.strictEqual(stub.sent[0].data.type, "chat_message");
  });
});
