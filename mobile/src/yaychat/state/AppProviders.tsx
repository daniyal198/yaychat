/** Global app state: auth session, toasts, and simulated network status. */
import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, palette, radius, shadows, spacing} from '../design/tokens';
import {YayText} from '../design/components';
import {
  ME_ID,
  analytics,
  authService,
  chatService,
  onOfflineChange,
  simulation,
  telemetryTransport,
} from '../services';
import {pushNotificationService} from '../services/pushNotifications';
import {telemetry} from '../services/telemetry';
import {callService} from '../services/calls/callService';
import {navigateToCall, navigateToDeepLink} from '../navigation/navigationRef';
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
// Reward pop-up
//
// A distinct, celebratory pill — "+20  Daily check-in" — for the moment
// IndexxPoints actually land in the balance, separate from the general-purpose
// toast above. Fired for actions the user just took (check-in, redeeming an
// invite code) and, on the Earn tab, for rewards the backend credited while
// the app was closed (the BTCY x YaysApp activation reward, a referral
// qualifying, an Ambassador tier) — see `services/rewardAlerts.ts`.
// ---------------------------------------------------------------------------

interface RewardToastState {
  showReward: (amount: number, label: string) => void;
}

const RewardToastContext = createContext<RewardToastState>({showReward: () => {}});
export const useRewardToast = () => useContext(RewardToastContext);

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

/** Format the exact unread count shown on app and tab badges. */
export const formatUnreadBadge = (n: number): string => String(Math.max(0, Math.floor(n)));

const chatNotificationPreview = (text: string): string => {
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : 'New message';
};

const SESSION_RESTORE_TIMEOUT_MS = 2500;

const restoreSessionWithTimeout = (): Promise<Session | null> =>
  Promise.race([
    authService.restoreSession(),
    new Promise<null>(resolve => {
      setTimeout(() => resolve(null), SESSION_RESTORE_TIMEOUT_MS);
    }),
  ]);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AppProviders = ({children}: {children: React.ReactNode}) => {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [offline, setOffline] = useState(simulation.offline);
  const [toast, setToast] = useState<{message: string; tone: ToastTone} | null>(null);
  const [rewardToast, setRewardToast] = useState<{amount: number; label: string} | null>(null);
  const rewardOpacity = useRef(new Animated.Value(0)).current;
  const rewardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [backendUnreadByConversation, setBackendUnreadByConversation] = useState<Record<string, number>>({});
  const [localUnreadByConversation, setLocalUnreadByConversation] = useState<Record<string, number>>({});
  const [serverUnreadTotal, setServerUnreadTotal] = useState(0);
  const [clearedLastMessageByConversation, setClearedLastMessageByConversation] = useState<Record<string, string>>({});
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageByConversation = useRef<Record<string, string | undefined>>({});
  const chatNotificationsReady = useRef(false);
  const activeConversationId = useRef<string | null>(null);
  const backendUnreadRef = useRef(backendUnreadByConversation);
  const localUnreadRef = useRef(localUnreadByConversation);
  const clearedLastMessageRef = useRef(clearedLastMessageByConversation);
  backendUnreadRef.current = backendUnreadByConversation;
  localUnreadRef.current = localUnreadByConversation;
  clearedLastMessageRef.current = clearedLastMessageByConversation;

  // Telemetry starts before anything else so a crash during session restore —
  // the launch path most likely to fail on a bad build — is still reported.
  useEffect(() => {
    telemetry.installGlobalHandler();
    telemetry
      .start(telemetryTransport)
      .then(() => telemetry.track('app_open', {cold: true}))
      .catch(() => {});
    return () => telemetry.stop();
  }, []);

  // Notification taps, from background and from cold start.
  useEffect(
    () => pushNotificationService.subscribeNotificationOpens(navigateToDeepLink),
    [],
  );

  useEffect(() => {
    let mounted = true;
    const unsubscribeOffline = onOfflineChange(setOffline);

    restoreSessionWithTimeout()
      .then(restored => {
        if (mounted) {
          setSession(restored);
        }
      })
      .catch(() => {
        if (mounted) {
          setSession(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setBooting(false);
        }
      });

    return () => {
      mounted = false;
      unsubscribeOffline();
    };
  }, []);

  const syncConversations = useCallback((conversations: Conversation[]) => {
    setBackendUnreadByConversation(prev => {
      const next: Record<string, number> = {};
      conversations.forEach(conversation => {
        const lastMessageId = conversation.lastMessage?.id;
        const wasClearedLocally =
          Boolean(lastMessageId) && clearedLastMessageRef.current[conversation.id] === lastMessageId;
        const count =
          activeConversationId.current === conversation.id || wasClearedLocally
            ? 0
            : Math.max(conversation.unreadCount, 0);

        if (count > 0) {
          next[conversation.id] = count;
        }
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      const unchanged =
        prevKeys.length === nextKeys.length &&
        nextKeys.every(conversationId => prev[conversationId] === next[conversationId]);
      return unchanged ? prev : next;
    });
    setLocalUnreadByConversation(prev => (Object.keys(prev).length > 0 ? {} : prev));
  }, []);

  const refreshUnread = useCallback(() => {
    chatService
      .getUnreadTotal()
      .then(total => setServerUnreadTotal(Math.max(0, total)))
      .catch(() => {});
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
    const currentLocal = localUnreadRef.current[conversationId] ?? 0;
    const currentCombined = Math.max(
      currentLocal,
      backendUnreadRef.current[conversationId] ?? 0,
    );
    const nextCount = Math.max(currentLocal + 1, count ?? 0);
    const increase = Math.max(0, nextCount - currentCombined);
    setLocalUnreadByConversation(prev => {
      const current = prev[conversationId] ?? 0;
      return {...prev, [conversationId]: Math.max(current + 1, count ?? 0)};
    });
    if (increase > 0) {
      setServerUnreadTotal(prev => prev + increase);
    }
  }, []);

  const clearConversation = useCallback((conversationId: string, lastMessageId?: string) => {
    const clearedCount = Math.max(
      localUnreadRef.current[conversationId] ?? 0,
      backendUnreadRef.current[conversationId] ?? 0,
    );
    if (clearedCount > 0) {
      setServerUnreadTotal(prev => Math.max(0, prev - clearedCount));
    }
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

  const conversationUnreadTotal = Array.from(
    new Set([...Object.keys(localUnreadByConversation), ...Object.keys(backendUnreadByConversation)]),
  ).reduce(
    (sum, conversationId) =>
      sum +
      Math.max(localUnreadByConversation[conversationId] ?? 0, backendUnreadByConversation[conversationId] ?? 0),
    0,
  );
  const unreadTotal = Math.max(serverUnreadTotal, conversationUnreadTotal);

  // Keep the badge in sync while signed in. Polling also picks up read state
  // changes (opening a chat clears its unread count in the store).
  useEffect(() => {
    if (!session) {
      setBackendUnreadByConversation(prev => (Object.keys(prev).length > 0 ? {} : prev));
      setLocalUnreadByConversation(prev => (Object.keys(prev).length > 0 ? {} : prev));
      setServerUnreadTotal(prev => (prev === 0 ? prev : 0));
      setClearedLastMessageByConversation(prev => (Object.keys(prev).length > 0 ? {} : prev));
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

  /**
   * Listen for incoming calls for as long as the user is signed in.
   *
   * Bound at the session level, not on a call screen: a call can arrive while
   * the user is anywhere in the app, and a listener that only exists on the
   * call screen would mean the phone never rings. The screen is pushed
   * imperatively because the ring has to interrupt whatever is on top.
   */
  useEffect(() => {
    if (!session) {
      callService.unbind();
      callService.clear();
      return;
    }
    let mounted = true;
    callService.bind().catch(() => {});
    const unsubscribe = callService.subscribe(state => {
      if (!mounted) {
        return;
      }
      if (state.phase === 'ringing' && state.direction === 'incoming') {
        navigateToCall('IncomingCall', {callId: state.callId ?? undefined});
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
      callService.unbind();
    };
  }, [session]);

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

  const showReward = useCallback(
    (amount: number, label: string) => {
      if (!(amount > 0)) {
        return;
      }
      setRewardToast({amount, label});
      Animated.spring(rewardOpacity, {toValue: 1, useNativeDriver: true, friction: 7}).start();
      if (rewardTimer.current) {
        clearTimeout(rewardTimer.current);
      }
      rewardTimer.current = setTimeout(() => {
        Animated.timing(rewardOpacity, {toValue: 0, duration: 220, useNativeDriver: true}).start(
          () => setRewardToast(null),
        );
      }, 2800);
    },
    [rewardOpacity],
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
      // Stop pushing to this device before the token is forgotten, and flush
      // the queue while the session that authorises it is still valid.
      await pushNotificationService.unregisterDevice();
      analytics.track('signout');
      await telemetry.flush().catch(() => {});
      await authService.signOut();
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
        <RewardToastContext.Provider value={{showReward}}>
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
            {rewardToast ? (
              <Animated.View
                style={[
                  styles.rewardPill,
                  {opacity: rewardOpacity, transform: [{scale: rewardOpacity}]},
                ]}
                pointerEvents="none">
                <View style={styles.rewardBadge}>
                  <YayText variant="bodyStrong" color={palette.white}>
                    {`+${rewardToast.amount}`}
                  </YayText>
                </View>
                <YayText variant="bodyStrong" color={palette.ember200}>
                  {rewardToast.label}
                </YayText>
              </Animated.View>
            ) : null}
          </View>
        </RewardToastContext.Provider>
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
  rewardPill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 168,
    zIndex: 1001,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.ink900,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.brown500,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: spacing.md,
    ...shadows.raised,
    elevation: 24,
  },
  rewardBadge: {
    backgroundColor: palette.ember400,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
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
