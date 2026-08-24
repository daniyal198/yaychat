import {createNavigationContainerRef} from '@react-navigation/native';
import type {DeepLinkTarget} from '../types/models';
import {navigationForTarget} from '../services/notifications/deepLinks';
import type {RootStackParamList} from '../types/navigation';

/**
 * Imperative navigation for notification taps.
 *
 * A push can arrive at any time, including before the navigator has mounted
 * (a cold start from a tapped notification is the common case). Targets that
 * arrive early are held in `pending` and replayed by the navigator's
 * `onReady`, so a cold-start tap lands on the right screen instead of the
 * default tab.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pending: DeepLinkTarget | null = null;

/** Navigate now, or remember the target until the navigator is ready. */
export const navigateToDeepLink = (target: DeepLinkTarget): boolean => {
  if (!navigationRef.isReady()) {
    pending = target;
    return false;
  }
  const {tab, screen, params} = navigationForTarget(target);
  navigationRef.navigate('Main' as never, {
    screen: tab,
    params: {
      screen,
      params,
      // `initial: false` is what gives the destination a back button. Without
      // it, navigating into a tab that has not mounted yet makes the target the
      // *initial* route of that stack, so a link into a conversation or a
      // community detail arrives with nothing underneath and no way back.
      // Targets that are themselves a tab root are unaffected — a root
      // correctly has no back button, and the tab bar is the way out.
      initial: false,
    },
  } as never);
  return true;
};

/** Called by the navigator once it can accept navigation. */
export const flushPendingDeepLink = (): DeepLinkTarget | null => {
  if (!pending) {
    return null;
  }
  const target = pending;
  pending = null;
  navigateToDeepLink(target);
  return target;
};

export const pendingDeepLink = (): DeepLinkTarget | null => pending;

/** Test hook. */
export const clearPendingDeepLink = () => {
  pending = null;
};

/**
 * Open a root-level call screen from anywhere.
 *
 * Calls live on the root stack while most call sites (chat, contacts) navigate
 * inside a tab stack, and an incoming call can arrive with no screen mounted at
 * all. Going through the container ref covers both without every caller having
 * to walk up to the root navigator.
 */
export const navigateToCall = (
  screen: 'IncomingCall' | 'ActiveCall' | 'CallHistory',
  params?: Record<string, unknown>,
): boolean => {
  if (!navigationRef.isReady()) {
    return false;
  }
  navigationRef.navigate(screen as never, params as never);
  return true;
};
