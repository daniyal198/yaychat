import {Platform} from 'react-native';
import {Session, DeepLinkTarget, PushStatus} from '../types/models';
import {targetFromPushData} from './notifications/deepLinks';
import {notificationService} from './index';
import {telemetry} from './telemetry';

/**
 * Module 6 — push notifications on the device.
 *
 * Firebase Messaging is loaded lazily and defensively. The native module is
 * only present in a build that has been given a Firebase config file, and
 * `require`ing it without one throws at module scope — which would take the
 * whole app down at import time rather than degrading the one feature. Every
 * entry point here works when the module is missing: registration is skipped,
 * subscriptions return a no-op cleanup, and `status()` says why push is not
 * arriving instead of pretending it is.
 */

type Cleanup = () => void;

const noop: Cleanup = () => {};

export interface ForegroundChatMessage {
  title: string;
  body: string;
  conversationId?: string;
  messageId?: string;
}

type MessagingModule = any;

let messagingModule: MessagingModule | null | undefined;

/** `null` once we know the native module is unavailable in this build. */
const messaging = (): MessagingModule | null => {
  if (messagingModule !== undefined) {
    return messagingModule;
  }
  try {
    const mod = require('@react-native-firebase/messaging');
    messagingModule = mod?.default ? mod : null;
  } catch {
    messagingModule = null;
  }
  return messagingModule;
};

const deviceInfo = (): any => {
  try {
    return require('react-native-device-info')?.default ?? null;
  } catch {
    return null;
  }
};

let cachedDeviceId: string | null = null;
let lastPermission: PushStatus['permission'] = 'undetermined';
let registeredToken: string | null = null;

/**
 * A stable id for this install. Falls back to a random id so a device without
 * `react-native-device-info` still gets exactly one registry row rather than a
 * new one on every launch — the fallback survives only for the process, which
 * is the honest trade when no stable id is available.
 */
const resolveDeviceId = async (): Promise<string> => {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }
  const info = deviceInfo();
  try {
    const unique = info ? await Promise.resolve(info.getUniqueId()) : null;
    cachedDeviceId = String(unique || '') || `anon_${Math.random().toString(36).slice(2, 12)}`;
  } catch {
    cachedDeviceId = `anon_${Math.random().toString(36).slice(2, 12)}`;
  }
  return cachedDeviceId;
};

const deviceMetadata = async () => {
  const info = deviceInfo();
  if (!info) {
    return {};
  }
  try {
    return {
      model: String(info.getModel?.() ?? ''),
      osVersion: String(info.getSystemVersion?.() ?? ''),
      appVersion: String(info.getVersion?.() ?? ''),
    };
  } catch {
    return {};
  }
};

const requestPermission = async (mod: MessagingModule): Promise<boolean> => {
  telemetry.track('push_permission_prompted');
  const status = await mod.default().requestPermission();
  const granted =
    status === mod.default.AuthorizationStatus.AUTHORIZED ||
    status === mod.default.AuthorizationStatus.PROVISIONAL;
  lastPermission = granted ? 'granted' : 'denied';
  telemetry.track('push_permission_result', {granted});
  return granted;
};

const registerRemoteMessages = async (mod: MessagingModule) => {
  if (Platform.OS === 'ios' && !mod.default().isDeviceRegisteredForRemoteMessages) {
    await mod.default().registerDeviceForRemoteMessages();
  }
};

const submitToken = async (token: string) => {
  if (!token) {
    return;
  }
  const [deviceId, metadata] = await Promise.all([resolveDeviceId(), deviceMetadata()]);
  await notificationService.registerDevice({
    deviceId,
    token,
    platform: Platform.OS === 'android' ? 'android' : 'ios',
    ...metadata,
  });
  registeredToken = token;
  telemetry.track('push_token_registered', {platform: Platform.OS});
};

export const pushNotificationService = {
  /** Whether this build can receive push at all. */
  isSupported(): boolean {
    return messaging() !== null;
  },

  /**
   * Ask for permission, register this device's token, and keep it fresh.
   *
   * Returns a cleanup that stops the token-refresh subscription. Failure is
   * never thrown: a user who declines the permission prompt, or a build with
   * no Firebase config, still gets a working app with an in-app inbox.
   */
  async registerForSession(_session: Session): Promise<Cleanup> {
    const mod = messaging();
    if (!mod) {
      return noop;
    }
    try {
      if (!(await requestPermission(mod))) {
        return noop;
      }
      await registerRemoteMessages(mod);
      const token = await mod.default().getToken();
      await submitToken(token);

      return mod.default().onTokenRefresh((nextToken: string) => {
        submitToken(nextToken).catch(() => {});
      });
    } catch (error) {
      telemetry.reportError(error, {fatal: false}).catch(() => {});
      return noop;
    }
  },

  /** Stop this device receiving push — used on sign-out. */
  async unregisterDevice(): Promise<void> {
    try {
      await notificationService.unregisterDevice(await resolveDeviceId());
      registeredToken = null;
    } catch {
      // Sign-out must not fail because the registry could not be reached.
    }
  },

  /**
   * Chat messages that arrive while the app is in the foreground. iOS does not
   * show a system banner in that state, so the app renders its own.
   */
  subscribeForegroundChatMessages(
    onMessage: (message: ForegroundChatMessage) => void,
  ): Cleanup {
    const mod = messaging();
    if (!mod) {
      return noop;
    }
    try {
      return mod.default().onMessage((remoteMessage: any) => {
        const data = remoteMessage?.data || {};
        if (String(data.type || '') !== 'chat_message') {
          return;
        }
        const target = targetFromPushData(data);
        onMessage({
          title: remoteMessage?.notification?.title || 'New message',
          body:
            remoteMessage?.notification?.body ||
            String(data.preview || '').trim() ||
            'New message',
          conversationId:
            target.route === 'chat.conversation' ? target.params.conversationId : undefined,
          messageId: data.messageId ? String(data.messageId) : undefined,
        });
      });
    } catch {
      return noop;
    }
  },

  /**
   * Notification taps, from both states that produce one: the app was in the
   * background (`onNotificationOpenedApp`), or the tap launched it from cold
   * (`getInitialNotification`). Both are handled here so the caller has a
   * single path to the deep-link router.
   */
  subscribeNotificationOpens(onOpen: (target: DeepLinkTarget) => void): Cleanup {
    const mod = messaging();
    if (!mod) {
      return noop;
    }
    const handle = (remoteMessage: any) => {
      if (!remoteMessage) {
        return;
      }
      const data = remoteMessage?.data || {};
      const target = targetFromPushData(data);
      telemetry.track('push_opened', {
        category: String(data.category || 'unknown'),
        route: target.route,
      });
      onOpen(target);
    };

    try {
      mod.default().getInitialNotification().then(handle).catch(() => {});
      return mod.default().onNotificationOpenedApp(handle);
    } catch {
      return noop;
    }
  },

  /** What the Profile screen shows when push is not arriving. */
  async status(): Promise<PushStatus> {
    if (!messaging()) {
      return {
        permission: 'undetermined',
        registered: false,
        transportLive: false,
        note: 'This build has no push configuration, so notifications appear in the app only.',
      };
    }
    const transportLive = await notificationService.transportLive();
    return {
      permission: lastPermission,
      registered: Boolean(registeredToken),
      transportLive,
      note:
        lastPermission !== 'granted'
          ? 'Notification permission has not been granted on this device.'
          : !transportLive
          ? 'Push delivery is not configured on the server yet — notifications appear in the app only.'
          : 'Push notifications are active on this device.',
    };
  },

  /** Test hook — forgets the cached native module and registration state. */
  reset() {
    messagingModule = undefined;
    cachedDeviceId = null;
    registeredToken = null;
    lastPermission = 'undetermined';
  },
};
