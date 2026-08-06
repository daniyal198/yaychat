/** Global app state: auth session, toasts, and simulated network status. */
import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, radius, shadows, spacing} from '../design/tokens';
import {YayText} from '../design/components';
import {ME_ID, analytics, authService, chatService, onOfflineChange, simulation} from '../services';
import {pushNotificationService} from '../services/pushNotifications';
import {Conversation, Session, User} from '../types/models';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

interface AuthState {
  booting: boolean;
  session: Session | null;
  signIn: (session: Session) => void;
  updateUser: (user: User) => void;
  completeOnboarding: (session: Session) => void;
  signOut: () => Promise<void>;
  expireSession: () => void;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AppProviders');
  }
  return ctx;
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

type ToastTone = 'success' | 'error' | 'info';
interface ToastState {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastState>({show: () => {}});
export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------------------
// Network (simulated offline mode)
// ---------------------------------------------------------------------------

const NetworkContext = createContext<{offline: boolean}>({offline: false});
export const useNetwork = () => useContext(NetworkContext);

// ---------------------------------------------------------------------------
// Unread messages (drives the Chats tab + home shortcut badges)
// ---------------------------------------------------------------------------

interface UnreadState {
  total: number;
  refresh: () => void;
  getConversationUnread: (conversationId: string) => number;
  recordIncoming: (conversationId: string, count?: number) => void;
  clearConversation: (conversationId: string, lastMessageId?: string) => void;
  syncConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (conversationId: string | null) => void;
}

const UnreadContext = createContext<UnreadState>({
  total: 0,
  refresh: () => {},
  getConversationUnread: () => 0,
  recordIncoming: () => {},
  clearConversation: () => {},
  syncConversations: () => {},
  setActiveConversation: () => {},
});
export const useUnread = () => useContext(UnreadContext);

/** Format an unread count for a compact badge: 1–8 exact, then "9+". */
export const formatUnreadBadge = (n: number): string => (n > 8 ? '9+' : String(n));

const chatNotificationPreview = (text: string): string => {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : 'New message';
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AppProviders = ({children}: {children: React.ReactNode}) => {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [offline, setOffline] = useState(simulation.offline);
  const [toast, setToast] = useState<{message: string; tone: ToastTone} | null>(null);
  const [backendUnreadByConversation, setBackendUnreadByConversation] = useState<Record<string, number>>({});
  const [localUnreadByConversation, setLocalUnreadByConversation] = useState<Record<string, number>>({});
  const [clearedLastMessageByConversation, setClearedLastMessageByConversation] = useState<Record<string, string>>({});
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageByConversation = useRef<Record<string, string | undefined>>({});
  const chatNotificationsReady = useRef(false);
  const activeConversationId = useRef<string | null>(null);

  useEffect(() => {
    authService
      .restoreSession()
      .then(restored => setSession(restored))
      .finally(() => setBooting(false));
    return onOfflineChange(setOffline);
  }, []);

  const syncConversations = useCallback((conversations: Conversation[]) => {
    setBackendUnreadByConversation(prev => {
      let changed = false;
      const next = {...prev};
      conversations.forEach(conversation => {
        const lastMessageId = conversation.lastMessage?.id;
        const wasClearedLocally =
          Boolean(lastMessageId) && clearedLastMessageByConversation[conversation.id] === lastMessageId;
        const count =
          activeConversationId.current === conversation.id || wasClearedLocally
            ? 0
            : Math.max(conversation.unreadCount, 0);

        if ((next[conversation.id] ?? 0) !== count) {
          if (count > 0) {
            next[conversation.id] = count;
          } else {
            delete next[conversation.id];
          }
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [clearedLastMessageByConversation]);

  const refreshUnread = useCallback(() => {
    chatService
      .listConversations('all')
      .then(syncConversations)
      .catch(() => {});
  }, [syncConversations]);

  const getConversationUnread = useCallback(
    (conversationId: string) =>
      Math.max(localUnreadByConversation[conversationId] ?? 0, backendUnreadByConversation[conversationId] ?? 0),
    [backendUnreadByConversation, localUnreadByConversation],
  );

  const recordIncoming = useCallback((conversationId: string, count?: number) => {
    if (activeConversationId.current === conversationId) {
      return;
    }
    setLocalUnreadByConversation(prev => {
      const current = prev[conversationId] ?? 0;
      const nextCount = Math.max(current + 1, count ?? 0);
      return {...prev, [conversationId]: nextCount};
    });
  }, []);

  const clearConversation = useCallback((conversationId: string, lastMessageId?: string) => {
    setLocalUnreadByConversation(prev => {
      if (!prev[conversationId]) {
        return prev;
      }
      const next = {...prev};
      delete next[conversationId];
      return next;
    });
    if (lastMessageId) {
      setClearedLastMessageByConversation(prev => ({...prev, [conversationId]: lastMessageId}));
    }
    setBackendUnreadByConversation(prev => {
      if (!prev[conversationId]) {
        return prev;
      }
      const next = {...prev};
      delete next[conversationId];
      return next;
    });
  }, []);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    activeConversationId.current = conversationId;
  }, []);

  const unreadTotal = Array.from(
    new Set([...Object.keys(localUnreadByConversation), ...Object.keys(backendUnreadByConversation)]),
  ).reduce(
    (sum, conversationId) =>
      sum +
      Math.max(localUnreadByConversation[conversationId] ?? 0, backendUnreadByConversation[conversationId] ?? 0),
    0,
  );

  // Keep the badge in sync while signed in. Polling also picks up read state
  // changes (opening a chat clears its unread count in the store).
  useEffect(() => {
    if (!session) {
      setBackendUnreadByConversation({});
      setLocalUnreadByConversation({});
      setClearedLastMessageByConversation({});
      return;
    }
    let mounted = true;
    let unsubscribePushTokenRefresh: (() => void) | undefined;
    pushNotificationService
      .registerForSession(session)
      .then(unsubscribe => {
        if (mounted) {
          unsubscribePushTokenRefresh = unsubscribe;
        } else {
          unsubscribe();
        }
      })
      .catch(() => {});
    refreshUnread();
    const id = setInterval(refreshUnread, 8000);
    return () => {
      mounted = false;
      clearInterval(id);
      unsubscribePushTokenRefresh?.();
    };
  }, [session, refreshUnread]);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      setToast({message, tone});
      Animated.timing(toastOpacity, {toValue: 1, duration: 180, useNativeDriver: true}).start();
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, {toValue: 0, duration: 240, useNativeDriver: true}).start(
          () => setToast(null),
        );
      }, 2600);
    },
    [toastOpacity],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    return pushNotificationService.subscribeForegroundChatMessages(message => {
      show(`${message.title}: ${chatNotificationPreview(message.body)}`, 'info');
      if (message.conversationId) {
        recordIncoming(message.conversationId);
      }
    });
  }, [session, show, recordIncoming]);

  // Surface incoming chat messages while the app is open. The backend chat
  // transport currently polls conversation summaries, so this gives users a
  // foreground notification as soon as a conversation's last incoming message
  // changes instead of silently updating the list.
  useEffect(() => {
    if (!session) {
      lastMessageByConversation.current = {};
      chatNotificationsReady.current = false;
      return;
    }

    let mounted = true;
    chatNotificationsReady.current = false;
    chatService
      .listConversations('all')
      .then(conversations => {
        if (!mounted) {
          return;
        }
        const snapshot: Record<string, string | undefined> = {};
        conversations.forEach(conversation => {
          snapshot[conversation.id] = conversation.lastMessage?.id;
        });
        syncConversations(conversations);
        lastMessageByConversation.current = snapshot;
        chatNotificationsReady.current = true;
      })
      .catch(() => {
        chatNotificationsReady.current = true;
      });

    const unsubscribe = chatService.subscribe(event => {
      if (event.type !== 'conversation.updated') {
        return;
      }
      const {conversation} = event;
      const lastMessage = conversation.lastMessage;
      const previousLastId = lastMessageByConversation.current[conversation.id];
      const ready = chatNotificationsReady.current;
      lastMessageByConversation.current[conversation.id] = lastMessage?.id;

      if (
        !lastMessage ||
        !ready ||
        previousLastId === lastMessage.id ||
        lastMessage.senderId === ME_ID ||
        conversation.muted
      ) {
        return;
      }

      show(`${conversation.title}: ${chatNotificationPreview(lastMessage.text)}`, 'info');
      syncConversations([conversation]);
      recordIncoming(conversation.id, conversation.unreadCount);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [session, show, recordIncoming, syncConversations]);

  const auth: AuthState = {
    booting,
    session,
    sessionExpired,
    signIn: s => {
      analytics.track('auth_signed_in');
      setSessionExpired(false);
      setSession(s);
    },
    updateUser: user => setSession(prev => (prev ? {...prev, user} : prev)),
    completeOnboarding: s => setSession(s),
    signOut: async () => {
      await authService.signOut();
      analytics.track('auth_signed_out');
      setSession(null);
      setSessionExpired(false);
    },
    expireSession: () => {
      setSessionExpired(true);
      setSession(null);
    },
  };

  const toastIcon = toast?.tone === 'success' ? 'checkmark-circle' : toast?.tone === 'error' ? 'alert-circle' : 'information-circle';
  const toastColor = toast?.tone === 'success' ? colors.success : toast?.tone === 'error' ? colors.danger : colors.info;

  return (
    <AuthContext.Provider value={auth}>
      <NetworkContext.Provider value={{offline}}>
        <UnreadContext.Provider
          value={{
            total: unreadTotal,
            refresh: refreshUnread,
            getConversationUnread,
            recordIncoming,
            clearConversation,
            syncConversations,
            setActiveConversation,
          }}>
        <ToastContext.Provider value={{show}}>
          <View style={{flex: 1}}>
            {children}
            {offline ? (
              <View style={styles.offlineBar}>
                <Ionicons name="cloud-offline" size={14} color={colors.textOnBrand} />
                <YayText variant="micro" color={colors.textOnBrand}>
                  Offline mode — showing cached data
                </YayText>
              </View>
            ) : null}
            {toast ? (
              <Animated.View style={[styles.toast, {opacity: toastOpacity}]} pointerEvents="none">
                <Ionicons name={toastIcon} size={18} color={toastColor} />
                <YayText variant="caption" style={{flex: 1}}>
                  {toast.message}
                </YayText>
              </Animated.View>
            ) : null}
          </View>
        </ToastContext.Provider>
        </UnreadContext.Provider>
      </NetworkContext.Provider>
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 96,
    zIndex: 1000,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.raised,
    elevation: 24,
  },
  offlineBar: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
});
