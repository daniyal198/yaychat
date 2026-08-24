/**
 * Module 6 — the delivery orchestration, executed end to end.
 *
 * The other M6 suites cover pure functions. This one runs the real
 * `NotificationDeliveryService` against in-memory stores and a stub transport,
 * so the sequence that actually decides whether a phone lights up — dedupe,
 * mute, category, quiet hours, inbox write, device fan-out, dead-token
 * disabling — is exercised rather than reasoned about.
 */
import assert from "assert";
import {
  NotificationDeliveryService,
  DeliveryStores,
  deliverChatMessage,
} from "../../services/notificationDelivery.service";
import {
  NotificationPreference,
  PushDevice,
  YaysNotification,
} from "../../data/yaysNotifications";
import {
  StubPushTransport,
  resetPushTransport,
} from "../../services/notifications/transports";

const basePreference = (
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

const device = (deviceId: string, token = `tok-${deviceId}`): PushDevice =>
  ({
    userLower: "ana@example.com",
    deviceId,
    platform: "ios",
    token,
    disabledAt: null,
  } as PushDevice);

/** In-memory stand-ins with the same contract as the Mongo-backed services. */
class Harness {
  rows: any[] = [];
  disabled: { deviceId: string; reason: string }[] = [];
  transport = new StubPushTransport();
  private idSeq = 0;

  constructor(
    private devices: PushDevice[],
    private preference: NotificationPreference
  ) {
    resetPushTransport(this.transport);
  }

  stores(): DeliveryStores {
    const self = this;
    return {
      devices: {
        async activeFor() {
          return self.devices.filter((d) => !d.disabledAt);
        },
        async disable(_userLower: string, deviceId: string, reason: string) {
          self.disabled.push({ deviceId, reason });
          const found = self.devices.find((d) => d.deviceId === deviceId);
          if (found) {
            (found as any).disabledAt = new Date();
          }
        },
      } as any,
      preferences: {
        async forUser() {
          return self.preference;
        },
      } as any,
      inbox: {
        async isDuplicate(userLower: string, dedupeKey: string) {
          return self.rows.some(
            (r) => r.userLower === userLower && r.dedupeKey === dedupeKey
          );
        },
        async create(row: YaysNotification) {
          self.idSeq += 1;
          const stored = { ...row, _id: `n${self.idSeq}` };
          self.rows.push(stored);
          return stored;
        },
        async findOne(cond: any) {
          return self.rows.find(
            (r) => r.userLower === cond.userLower && r.dedupeKey === cond.dedupeKey
          );
        },
        async updatePart(query: any, update: any) {
          const row = self.rows.find((r) => r._id === query._id);
          if (row) {
            Object.assign(row, update.$set || {});
          }
          return row;
        },
      } as any,
    };
  }

  service() {
    return new NotificationDeliveryService(this.stores());
  }
}

const request = (overrides: any = {}) => ({
  userLower: "ana@example.com",
  category: "messages" as const,
  title: "Ben",
  body: "see you at 8",
  ...overrides,
});

describe("M6 delivery, executed", () => {
  afterEach(() => resetPushTransport());

  it("delivers to every device the user is signed in on", async () => {
    const h = new Harness([device("d1"), device("d2")], basePreference());
    const result = await h.service().deliver(request());

    assert.strictEqual(result.outcome, "delivered");
    assert.strictEqual(result.delivered, 2);
    assert.strictEqual(h.transport.sent.length, 2);
    assert.deepStrictEqual(
      h.transport.sent.map((s) => s.token).sort(),
      ["tok-d1", "tok-d2"]
    );
  });

  it("writes an inbox row carrying the deep link", async () => {
    const h = new Harness([device("d1")], basePreference());
    await h.service().deliver(
      request({
        deepLink: {
          route: "chat.conversation",
          params: { conversationId: "dm:ben@example.com" },
          url: "yaychat://chat/dm%3Aben%40example.com",
        },
      })
    );

    assert.strictEqual(h.rows.length, 1);
    assert.strictEqual(h.rows[0].deepLinkRoute, "chat.conversation");
    assert.strictEqual(h.rows[0].outcome, "delivered");
    // The push payload has to carry the route too, or the tap cannot route.
    assert.strictEqual(h.transport.sent[0].data.deepLinkRoute, "chat.conversation");
    assert.strictEqual(
      h.transport.sent[0].data.conversationId,
      "dm:ben@example.com"
    );
  });

  // The inbox row is written even when the push is suppressed — a user with
  // notifications off still has to be able to discover what happened.
  it("records a suppressed notification without pushing it", async () => {
    const h = new Harness([device("d1")], basePreference({ messages: false }));
    const result = await h.service().deliver(request());

    assert.strictEqual(result.outcome, "preference_off");
    assert.strictEqual(result.delivered, 0);
    assert.strictEqual(h.transport.sent.length, 0);
    assert.strictEqual(h.rows.length, 1);
    assert.strictEqual(h.rows[0].outcome, "preference_off");
  });

  it("stays silent for a muted conversation", async () => {
    const h = new Harness(
      [device("d1")],
      basePreference({ mutedConversationIds: ["dm:ben@example.com"] })
    );
    const result = await h
      .service()
      .deliver(request({ conversationId: "dm:ben@example.com" }));

    assert.strictEqual(result.outcome, "muted");
    assert.strictEqual(h.transport.sent.length, 0);
  });

  it("drops a duplicate rather than notifying twice", async () => {
    const h = new Harness([device("d1")], basePreference());
    const service = h.service();
    const first = await service.deliver(request({ dedupeKey: "msg:1" }));
    const second = await service.deliver(request({ dedupeKey: "msg:1" }));

    assert.strictEqual(first.outcome, "delivered");
    assert.strictEqual(second.outcome, "duplicate");
    assert.strictEqual(h.transport.sent.length, 1);
    assert.strictEqual(h.rows.length, 1);
  });

  it("reports no_devices when nothing is registered", async () => {
    const h = new Harness([], basePreference());
    const result = await h.service().deliver(request());

    assert.strictEqual(result.outcome, "no_devices");
    assert.strictEqual(h.rows[0].outcome, "no_devices");
  });

  // Hiding the preview is a lock-screen setting: the push body changes, the
  // stored notification keeps the real text.
  it("hides the body from the push but not from the inbox", async () => {
    const h = new Harness([device("d1")], basePreference({ previewText: false }));
    await h.service().deliver(request());

    assert.strictEqual(h.transport.sent[0].body, "New notification");
    assert.strictEqual(h.rows[0].body, "see you at 8");
  });

  it("passes the sound preference through to the transport", async () => {
    const h = new Harness([device("d1")], basePreference({ sounds: false }));
    await h.service().deliver(request());
    assert.strictEqual(h.transport.sent[0].sound, false);
  });

  it("disables a device whose token the transport rejects", async () => {
    const h = new Harness([device("d1"), device("d2")], basePreference());
    const stores = h.stores();
    // d1's token is gone; d2 still works.
    (h.transport as any).send = async (payload: any) => {
      h.transport.sent.push(payload);
      return payload.token === "tok-d1"
        ? { ok: false, error: "messaging/registration-token-not-registered", tokenGone: true }
        : { ok: true };
    };

    const result = await new NotificationDeliveryService(stores).deliver(request());

    assert.strictEqual(result.delivered, 1);
    assert.strictEqual(h.disabled.length, 1);
    assert.strictEqual(h.disabled[0].deviceId, "d1");
    assert.strictEqual(result.attempts.find((a) => a.deviceId === "d1")?.ok, false);
  });

  it("reports failure when every device rejects", async () => {
    const h = new Harness([device("d1")], basePreference());
    const stores = h.stores();
    (h.transport as any).send = async () => ({ ok: false, error: "unavailable" });

    const result = await new NotificationDeliveryService(stores).deliver(request());

    assert.strictEqual(result.outcome, "failed");
    assert.strictEqual(result.delivered, 0);
    assert.strictEqual(h.rows[0].outcome, "failed");
  });

  it("refuses an empty recipient instead of writing a stray row", async () => {
    const h = new Harness([device("d1")], basePreference());
    const result = await h.service().deliver(request({ userLower: "  " }));

    assert.strictEqual(result.outcome, "failed");
    assert.strictEqual(h.rows.length, 0);
  });

  it("fans a broadcast out to each recipient once", async () => {
    const h = new Harness([device("d1")], basePreference());
    const result = await h
      .service()
      .deliverMany(["ana@example.com", "ANA@example.com", "", "bea@example.com"], {
        category: "system",
        title: "Maintenance",
        body: "Back at 9",
      });

    // Case-folded and de-duplicated: two distinct people, not four sends.
    assert.strictEqual(result.results.length, 2);
    assert.strictEqual(result.delivered, 2);
  });
});

describe("M6 chat delivery", () => {
  afterEach(() => resetPushTransport());

  // `deliverChatMessage` builds the deep link and the dedupe key, so a retried
  // send cannot produce a second notification for the same message.
  it("builds a conversation deep link and a per-message dedupe key", async () => {
    const stub = new StubPushTransport();
    resetPushTransport(stub);

    const captured: any[] = [];
    const original = (NotificationDeliveryService.prototype as any).deliver;
    (NotificationDeliveryService.prototype as any).deliver = async function (r: any) {
      captured.push(r);
      return { outcome: "delivered", delivered: 1, attempts: [] };
    };
    try {
      await deliverChatMessage({
        recipientEmail: "ana@example.com",
        senderEmail: "Ben@Example.com",
        senderName: "Ben",
        preview: "see you at 8",
        conversationId: "dm:ben@example.com",
        messageId: "m-42",
      });
    } finally {
      (NotificationDeliveryService.prototype as any).deliver = original;
    }

    assert.strictEqual(captured.length, 1);
    assert.strictEqual(captured[0].dedupeKey, "msg:m-42");
    assert.strictEqual(captured[0].category, "messages");
    assert.strictEqual(captured[0].deepLink.route, "chat.conversation");
    assert.strictEqual(captured[0].conversationId, "dm:ben@example.com");
    assert.strictEqual(captured[0].data.from, "ben@example.com");
  });

  it("files a group message under the communities category", async () => {
    const captured: any[] = [];
    const original = (NotificationDeliveryService.prototype as any).deliver;
    (NotificationDeliveryService.prototype as any).deliver = async function (r: any) {
      captured.push(r);
      return { outcome: "delivered", delivered: 1, attempts: [] };
    };
    try {
      await deliverChatMessage({
        recipientEmail: "ana@example.com",
        senderEmail: "ben@example.com",
        senderName: "Ben",
        preview: "standup in 5",
        conversationId: "group:42",
        messageId: "m-43",
        groupName: "Team",
      });
    } finally {
      (NotificationDeliveryService.prototype as any).deliver = original;
    }

    assert.strictEqual(captured[0].category, "communities");
    assert.strictEqual(captured[0].title, "Ben · Team");
  });
});
