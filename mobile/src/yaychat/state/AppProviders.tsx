/** Global app state: auth session, toasts, and simulated network status. */
import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, radius, shadows, spacing} from '../design/tokens';
import {YayText} from '../design/components';
import {analytics, authService, chatService, onOfflineChange, simulation} from '../services';
import {Session, User} from '../types/models';

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
}

const UnreadContext = createContext<UnreadState>({total: 0, refresh: () => {}});
export const useUnread = () => useContext(UnreadContext);

/** Format an unread count for a compact badge: 1–8 exact, then "9+". */
export const formatUnreadBadge = (n: number): string => (n > 8 ? '9+' : String(n));

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AppProviders = ({children}: {children: React.ReactNode}) => {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [offline, setOffline] = useState(simulation.offline);
  const [toast, setToast] = useState<{message: string; tone: ToastTone} | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    authService
      .restoreSession()
      .then(restored => setSession(restored))
      .finally(() => setBooting(false));
    return onOfflineChange(setOffline);
  }, []);

  const refreshUnread = useCallback(() => {
    chatService
      .getUnreadTotal()
      .then(setUnreadTotal)
      .catch(() => {});
  }, []);

  // Keep the badge in sync while signed in. Polling also picks up read state
  // changes (opening a chat clears its unread count in the store).
  useEffect(() => {
    if (!session) {
      setUnreadTotal(0);
      return;
    }
    refreshUnread();
    const id = setInterval(refreshUnread, 3000);
    return () => clearInterval(id);
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
        <UnreadContext.Provider value={{total: unreadTotal, refresh: refreshUnread}}>
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
