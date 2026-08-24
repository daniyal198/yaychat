/**
 * Module 6 — notifications, analytics, and crash reporting on the device.
 *
 * Covers the acceptance criteria a user feels: a tapped notification opens the
 * right screen, preferences actually change what arrives, events survive a
 * failed flush without being counted twice, and a crash still reaches the
 * server on the launch after the one that died.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  INBOX_TARGET,
  navigationForTarget,
  parseDeepLinkUrl,
  targetFromPushData,
} from '../src/yaychat/services/notifications/deepLinks';
import {telemetry} from '../src/yaychat/services/telemetry';
import {notificationService, simulation} from '../src/yaychat/services';
import {secureTokenStore} from '../src/yaychat/services/client';
import {pushNotificationService} from '../src/yaychat/services/pushNotifications';
import {
  clearPendingDeepLink,
  navigateToDeepLink,
  pendingDeepLink,
} from '../src/yaychat/navigation/navigationRef';

beforeAll(() => {
  simulation.latencyMs = 0;
});

// ---------------------------------------------------------------------------
// Deep links
// ---------------------------------------------------------------------------

describe('notification deep links', () => {
  it('routes a chat push to the conversation it came from', () => {
    const target = targetFromPushData({
      type: 'chat_message',
      deepLinkRoute: 'chat.conversation',
      conversationId: 'dm:ben@example.com',
    });
    expect(target).toEqual({
      route: 'chat.conversation',
      params: {conversationId: 'dm:ben@example.com'},
    });
  });

  it('falls back to the URL when the route field is missing', () => {
    const target = targetFromPushData({
      deepLinkUrl: 'yaychat://c/community-7/chat',
    });
    expect(target).toEqual({route: 'community.chat', params: {communityId: 'community-7'}});
  });

  // An older build must not be broken by a route added after it shipped.
  it('sends an unknown route to the inbox rather than nowhere', () => {
    expect(targetFromPushData({deepLinkRoute: 'wallet.send', amount: '10'})).toEqual(
      INBOX_TARGET,
    );
  });

  it('sends an empty payload to the inbox', () => {
    expect(targetFromPushData(undefined)).toEqual(INBOX_TARGET);
    expect(targetFromPushData({})).toEqual(INBOX_TARGET);
  });

  // A route with a missing id would navigate to a screen that cannot load.
  it('ignores a route whose required param is empty', () => {
    expect(targetFromPushData({deepLinkRoute: 'chat.conversation', conversationId: ''})).toEqual(
      INBOX_TARGET,
    );
  });

  it('still opens the conversation for a legacy payload with only an id', () => {
    expect(targetFromPushData({type: 'chat_message', conversationId: 'group:42'})).toEqual({
      route: 'chat.conversation',
      params: {conversationId: 'group:42'},
    });
  });

  it('parses both the app scheme and the https twin', () => {
    expect(parseDeepLinkUrl('yaychat://chat/dm%3Aben%40example.com')).toEqual({
      route: 'chat.conversation',
      params: {conversationId: 'dm:ben@example.com'},
    });
    expect(parseDeepLinkUrl('https://yay.chat/c/abc')).toEqual({
      route: 'community.detail',
      params: {communityId: 'abc'},
    });
  });

  // `c/:id/chat` and `c/:id` both match a prefix — the longer one has to win.
  it('prefers the more specific community route', () => {
    expect(parseDeepLinkUrl('yaychat://c/abc/chat')?.route).toBe('community.chat');
  });

  it('returns null for a URL it does not recognise', () => {
    expect(parseDeepLinkUrl('yaychat://wallet/send')).toBeNull();
    expect(parseDeepLinkUrl('')).toBeNull();
  });

  it('routes a communities notification to the communities list', () => {
    expect(parseDeepLinkUrl('yaychat://c')).toEqual({route: 'community.list', params: {}});
    expect(navigationForTarget({route: 'community.list', params: {}})).toEqual({
      tab: 'CommunitiesTab',
      screen: 'CommunitiesHome',
    });
  });

  it('maps every target onto a tab and screen', () => {
    expect(navigationForTarget({route: 'chat.conversation', params: {conversationId: 'x'}})).toEqual(
      {tab: 'ChatsTab', screen: 'Conversation', params: {conversationId: 'x'}},
    );
    expect(navigationForTarget(INBOX_TARGET)).toEqual({
      tab: 'ProfileTab',
      screen: 'Notifications',
    });
    expect(navigationForTarget({route: 'rewards.home', params: {}}).tab).toBe('EarnTab');
  });
});

// Sample notifications ship with the app, but chat and communities run against
// the real backend — a seeded `c_amara` id would resolve to nothing and the
// screen would error. Every seeded link must therefore be one that resolves
// without backend data.
describe('seeded notification links', () => {
  it('never points at an id that only exists in the mock dataset', async () => {
    const items = await notificationService.list();
    const idBearing = ['chat.conversation', 'community.detail', 'community.chat'];
    for (const item of items) {
      if (item.deepLink) {
        expect(idBearing).not.toContain(item.deepLink.route);
      }
    }
  });

  it('gives every seeded link a destination the app can render', async () => {
    const items = await notificationService.list();
    for (const item of items.filter(n => n.deepLink)) {
      const nav = navigationForTarget(item.deepLink!);
      expect(nav.tab).toBeTruthy();
      expect(nav.screen).toBeTruthy();
    }
  });
});

describe('cold-start notification taps', () => {
  beforeEach(() => clearPendingDeepLink());

  // The tap that launches the app resolves before the navigator mounts; if it
  // were dropped the user would land on the default tab instead of the chat
  // they tapped.
  it('holds a target until the navigator is ready', () => {
    const target = {route: 'chat.conversation' as const, params: {conversationId: 'dm:a@b.c'}};
    expect(navigateToDeepLink(target)).toBe(false);
    expect(pendingDeepLink()).toEqual(target);
  });
});

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

const makeTransport = () => {
  const batches: any[] = [];
  const crashes: any[] = [];
  return {
    batches,
    crashes,
    failNext: false,
    async sendEvents(batch: any) {
      if (transport.failNext) {
        transport.failNext = false;
        throw new Error('network');
      }
      batches.push(batch);
    },
    async sendCrash(payload: any) {
      crashes.push(payload);
    },
  };
};
let transport = makeTransport();

describe('analytics pipeline', () => {
  beforeEach(async () => {
    await telemetry.reset();
    await AsyncStorage.clear();
    transport = makeTransport();
    await telemetry.start(transport);
  });

  afterEach(() => telemetry.stop());

  it('queues events without waiting on the network', () => {
    telemetry.track('chat_opened', {kind: 'direct'});
    const pending = telemetry.pending();
    expect(pending.some(e => e.name === 'chat_opened')).toBe(true);
  });

  it('stamps every event with a unique id so a retry cannot double-count', () => {
    telemetry.track('message_sent');
    telemetry.track('message_sent');
    const ids = telemetry.pending().map(e => e.eventId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('drops non-scalar properties before they ever reach the queue', () => {
    telemetry.track('message_sent', {kind: 'text', payload: {body: 'secret'}});
    const event = telemetry.pending().find(e => e.name === 'message_sent');
    expect(event?.props).toEqual({kind: 'text'});
  });

  it('groups events into one session', () => {
    telemetry.track('app_open');
    telemetry.track('chat_opened');
    const sessions = new Set(telemetry.pending().map(e => e.sessionId));
    expect(sessions.size).toBe(1);
    expect(sessions.has(telemetry.currentSessionId())).toBe(true);
  });

  it('sends the queue and clears it', async () => {
    telemetry.track('chat_opened');
    await telemetry.flush();
    expect(transport.batches.length).toBe(1);
    expect(telemetry.pending()).toEqual([]);
  });

  // A flush that fails must neither lose the batch nor send it twice — the
  // server's id index absorbs the resend.
  it('keeps events queued when the flush fails, then sends them once', async () => {
    telemetry.track('chat_opened');
    const queuedId = telemetry.pending()[0].eventId;
    transport.failNext = true;
    await telemetry.flush();
    expect(telemetry.pending().some(e => e.eventId === queuedId)).toBe(true);

    await telemetry.flush();
    const sentIds = transport.batches.flatMap((b: any) => b.events.map((e: any) => e.eventId));
    expect(sentIds.filter((id: string) => id === queuedId).length).toBe(1);
  });

  it('records a screen view and keeps it as a crash breadcrumb', async () => {
    telemetry.screen('ChatList');
    expect(telemetry.pending().some(e => e.name === 'screen_view')).toBe(true);

    await telemetry.reportError(new Error('boom'), {fatal: false});
    expect(transport.crashes[0].crash.breadcrumbs).toContain('screen:ChatList');
  });

  // Mirrored to storage on a short coalescing window, so the trail survives
  // the process that produced it.
  it('persists the queue so events survive the process that produced them', async () => {
    telemetry.track('chat_opened');
    await new Promise(resolve => setTimeout(resolve, 300));
    const raw = await AsyncStorage.getItem('yaychat.telemetry.queue.v1');
    expect(JSON.parse(raw as string).some((e: any) => e.name === 'chat_opened')).toBe(true);
  });

  // A fatal crash cannot wait for the window: the events that explain it have
  // to be on disk before the process dies.
  it('forces the queue to disk before recording a fatal crash', async () => {
    telemetry.track('message_send_failed', {reason: 'timeout'});
    await telemetry.reportError(new Error('boom'), {fatal: true});
    const raw = await AsyncStorage.getItem('yaychat.telemetry.queue.v1');
    expect(JSON.parse(raw as string).some((e: any) => e.name === 'message_send_failed')).toBe(
      true,
    );
  });
});

describe('crash reporting', () => {
  beforeEach(async () => {
    await telemetry.reset();
    await AsyncStorage.clear();
    transport = makeTransport();
    await telemetry.start(transport);
  });

  afterEach(() => telemetry.stop());

  it('reports a handled error with its stack', async () => {
    await telemetry.reportError(new Error('kaboom'), {fatal: false});
    expect(transport.crashes[0].crash.level).toBe('handled');
    expect(transport.crashes[0].crash.message).toBe('kaboom');
    expect(transport.crashes[0].crash.stack.length).toBeGreaterThan(0);
  });

  it('coerces a non-Error throw into a report', async () => {
    await telemetry.reportError('just a string', {fatal: false});
    expect(transport.crashes[0].crash.message).toContain('just a string');
  });

  // A fatal crash kills the JS thread before an in-flight request completes,
  // so it has to be on disk first and sent on the next launch.
  it('leaves a fatal crash on disk when the send fails, and sends it next launch', async () => {
    const failing = {
      ...makeTransport(),
      sendEvents: async () => {},
      sendCrash: async () => {
        throw new Error('offline');
      },
    };
    telemetry.stop();
    await telemetry.reset();
    await telemetry.start(failing as any);
    await telemetry.reportError(new Error('fatal boom'), {fatal: true});

    const stored = await AsyncStorage.getItem('yaychat.telemetry.pendingCrash.v1');
    expect(JSON.parse(stored as string).message).toBe('fatal boom');

    telemetry.stop();
    await telemetry.reset();
    // The pending-crash key deliberately survives `reset` being called on a
    // fresh instance in the same way a relaunch survives a process exit.
    await AsyncStorage.setItem(
      'yaychat.telemetry.pendingCrash.v1',
      JSON.stringify({
        crashId: 'c1',
        level: 'fatal',
        name: 'Error',
        message: 'fatal boom',
        stack: '',
        breadcrumbs: [],
        occurredAt: new Date().toISOString(),
      }),
    );
    transport = makeTransport();
    await telemetry.start(transport);
    expect(transport.crashes[0].crash.message).toBe('fatal boom');

    expect(await AsyncStorage.getItem('yaychat.telemetry.pendingCrash.v1')).toBeNull();
  });

  it('does not persist a handled error — only fatals need to survive a restart', async () => {
    await telemetry.reportError(new Error('handled'), {fatal: false});
    expect(await AsyncStorage.getItem('yaychat.telemetry.pendingCrash.v1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Preferences and inbox (mock transport — the deployment has no M6 routes yet)
// ---------------------------------------------------------------------------

describe('notification preferences', () => {
  it('defaults every category on, with quiet hours off', async () => {
    const preferences = await notificationService.preferences();
    expect(preferences.messages).toBe(true);
    expect(preferences.communities).toBe(true);
    expect(preferences.rewards).toBe(true);
    expect(preferences.system).toBe(true);
    expect(preferences.previewText).toBe(true);
    expect(preferences.quietHours.enabled).toBe(false);
  });

  it('persists a switched-off category', async () => {
    await notificationService.updatePreferences({rewards: false});
    expect((await notificationService.preferences()).rewards).toBe(false);
    await notificationService.updatePreferences({rewards: true});
  });

  it('merges a quiet-hours patch instead of replacing the record', async () => {
    const updated = await notificationService.updatePreferences({
      quietHours: {
        enabled: true,
        startMinute: 23 * 60,
        endMinute: 6 * 60,
        utcOffsetMinutes: 60,
      },
    });
    expect(updated.quietHours.enabled).toBe(true);
    expect(updated.messages).toBe(true);
    await notificationService.updatePreferences({
      quietHours: {
        enabled: false,
        startMinute: 22 * 60,
        endMinute: 7 * 60,
        utcOffsetMinutes: 0,
      },
    });
  });

  it('mutes and unmutes one conversation', async () => {
    let preferences = await notificationService.setConversationMuted('dm:ben@example.com', true);
    expect(preferences.mutedConversationIds).toContain('dm:ben@example.com');

    preferences = await notificationService.setConversationMuted('dm:ben@example.com', false);
    expect(preferences.mutedConversationIds).not.toContain('dm:ben@example.com');
  });
});

describe('notification inbox', () => {
  it('lists notifications and reports the unread count', async () => {
    const items = await notificationService.list();
    expect(items.length).toBeGreaterThan(0);
    expect(await notificationService.unreadCount()).toBeGreaterThan(0);
  });

  it('marks everything read', async () => {
    await notificationService.markAllRead();
    expect(await notificationService.unreadCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Push service degradation
// ---------------------------------------------------------------------------

// Until the M6 routes are deployed, token registration must still reach the
// shared Indexx registry — otherwise shipping this module would silently stop
// push for every fresh install.
describe('device registration before M6 is deployed', () => {
  it('falls back to the legacy registry rather than registering nowhere', async () => {
    const posted: string[] = [];
    // The legacy endpoint is keyed by email, so it needs a stored session.
    await secureTokenStore.save(
      JSON.stringify({token: 't', onboarded: true, user: {id: 'u1', email: 'a@b.c'}}),
    );
    const api = require('../src/services/api').default;
    const original = api.post;
    api.post = async (path: string) => {
      posted.push(path);
      return {data: {status: 200, data: {}}};
    };
    try {
      await notificationService.registerDevice({
        deviceId: 'device-1',
        token: 'tok-1',
        platform: 'ios',
      });
    } catch {
      // A missing session is fine here; the assertion is about the path used.
    } finally {
      api.post = original;
    }
    expect(posted.some(p => p.includes('saveDeviceToken'))).toBe(true);
  });
});

describe('push on a build without Firebase', () => {
  beforeEach(() => pushNotificationService.reset());

  // The native module is absent in the test environment, which is exactly the
  // configuration a build without a Firebase config file has. Every entry
  // point has to stay callable.
  it('registers as a no-op instead of throwing', async () => {
    const cleanup = await pushNotificationService.registerForSession({} as any);
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('returns a working cleanup from every subscription', () => {
    expect(() => pushNotificationService.subscribeForegroundChatMessages(() => {})()).not.toThrow();
    expect(() => pushNotificationService.subscribeNotificationOpens(() => {})()).not.toThrow();
  });

  it('says why push is not arriving rather than reporting success', async () => {
    const status = await pushNotificationService.status();
    expect(status.registered).toBe(false);
    expect(status.note.length).toBeGreaterThan(0);
  });

  it('never fails a sign-out because the registry was unreachable', async () => {
    await expect(pushNotificationService.unregisterDevice()).resolves.toBeUndefined();
  });
});
