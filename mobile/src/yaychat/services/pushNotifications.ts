import {Platform} from 'react-native';
import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import DeviceInfo from 'react-native-device-info';
import API from '../../services/api';
import {Session} from '../types/models';

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const directConversationId = (email: string) => `dm:${normalizeEmail(email)}`;

type Cleanup = () => void;

const requestPermission = async (): Promise<boolean> => {
  const status = await messaging().requestPermission();
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
};

const registerRemoteMessages = async () => {
  if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages();
  }
};

const getUniqueDeviceId = async () => Promise.resolve(DeviceInfo.getUniqueId());

const postDeviceToken = async (session: Session, token: string) => {
  const email = normalizeEmail(session.user.email);
  if (!email || !token) {
    return;
  }

  await API.post(
    '/api/v1/inex/user/saveDeviceToken',
    {
      email,
      token,
      type: Platform.OS,
      model: DeviceInfo.getModel(),
      osVersion: DeviceInfo.getSystemVersion(),
      uniqueId: await getUniqueDeviceId(),
      brand: DeviceInfo.getBrand(),
    },
    session.token ? {headers: {Authorization: `Bearer ${session.token}`}} : undefined,
  );
};

export const pushNotificationService = {
  async registerForSession(session: Session): Promise<Cleanup> {
    const allowed = await requestPermission();
    if (!allowed) {
      return () => {};
    }

    await registerRemoteMessages();
    const token = await messaging().getToken();
    await postDeviceToken(session, token);

    return messaging().onTokenRefresh(nextToken => {
      postDeviceToken(session, nextToken).catch(() => {});
    });
  },

  subscribeForegroundChatMessages(
    onMessage: (message: {title: string; body: string; conversationId?: string}) => void,
  ): Cleanup {
    return messaging().onMessage((remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      const type = String(remoteMessage.data?.type || '');
      if (type !== 'chat_message') {
        return;
      }

      const from = normalizeEmail(remoteMessage.data?.from);
      onMessage({
        title: remoteMessage.notification?.title || 'New message',
        body:
          remoteMessage.notification?.body ||
          String(remoteMessage.data?.preview || '').trim() ||
          'New message',
        conversationId: from ? directConversationId(from) : undefined,
      });
    });
  },
};
