import type {DeepLinkRoute, DeepLinkTarget} from '../../types/models';

/**
 * Client mirror of the server's notification deep-link registry
 * (`backend/services/notifications/deepLinks.ts`).
 *
 * A notification carries both a route name and a `yaychat://` URL. The route
 * name is authoritative; the URL is the fallback for links that arrive from
 * outside the push pipeline (an email, a shared link, a cold start via
 * Universal Links).
 *
 * Anything unrecognised resolves to the inbox rather than being dropped: an
 * older build receiving a route added after it shipped should still open
 * *somewhere* the user can find the notification.
 */

const ROUTE_PARAMS: Record<DeepLinkRoute, string[]> = {
  'chat.conversation': ['conversationId'],
  'chat.list': [],
  'community.list': [],
  'community.detail': ['communityId'],
  'community.chat': ['communityId'],
  'rewards.home': [],
  'notifications.inbox': [],
  'support.ticket': ['ticketId'],
};

/** URL path patterns, longest-first so `c/:id/chat` wins over `c/:id`. */
const URL_PATTERNS: {pattern: RegExp; route: DeepLinkRoute; params: string[]}[] = [
  {pattern: /^c\/([^/]+)\/chat$/, route: 'community.chat', params: ['communityId']},
  {pattern: /^c\/([^/]+)$/, route: 'community.detail', params: ['communityId']},
  {pattern: /^c$/, route: 'community.list', params: []},
  {pattern: /^chat\/(.+)$/, route: 'chat.conversation', params: ['conversationId']},
  {pattern: /^chat$/, route: 'chat.list', params: []},
  {pattern: /^support\/([^/]+)$/, route: 'support.ticket', params: ['ticketId']},
  {pattern: /^earn$/, route: 'rewards.home', params: []},
  {pattern: /^notifications$/, route: 'notifications.inbox', params: []},
];

export const INBOX_TARGET: DeepLinkTarget = {route: 'notifications.inbox', params: {}};

export const isDeepLinkRoute = (value: unknown): value is DeepLinkRoute =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROUTE_PARAMS, value);

/** Strip the scheme/origin and leading slashes from a deep link. */
const pathOf = (url: string): string =>
  String(url || '')
    .replace(/^yaychat:\/\//i, '')
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .split('?')[0];

/** Parse a `yaychat://…` or `https://yay.chat/…` URL. Null when unrecognised. */
export const parseDeepLinkUrl = (url: string): DeepLinkTarget | null => {
  const path = pathOf(url);
  if (!path) {
    return null;
  }
  for (const {pattern, route, params} of URL_PATTERNS) {
    const match = path.match(pattern);
    if (!match) {
      continue;
    }
    const resolved: Record<string, string> = {};
    params.forEach((name, index) => {
      resolved[name] = decodeURIComponent(match[index + 1] || '');
    });
    if (params.some(name => !resolved[name])) {
      return null;
    }
    return {route, params: resolved};
  }
  return null;
};

/**
 * Resolve the target of a tapped notification from its push `data` payload.
 *
 * Order matters: the explicit route is tried first, then the URL, then the
 * inbox. A route with a missing required param is not usable, so it falls
 * through to the URL rather than navigating with an undefined id.
 */
export const targetFromPushData = (
  data: Record<string, unknown> | undefined | null,
): DeepLinkTarget => {
  const route = data?.deepLinkRoute;
  if (isDeepLinkRoute(route)) {
    const required = ROUTE_PARAMS[route];
    const params: Record<string, string> = {};
    for (const name of required) {
      const value = String(data?.[name] ?? '').trim();
      if (!value) {
        params[name] = '';
        break;
      }
      params[name] = value;
    }
    if (required.every(name => params[name])) {
      return {route, params};
    }
  }

  const url = data?.deepLinkUrl;
  if (typeof url === 'string' && url) {
    const parsed = parseDeepLinkUrl(url);
    if (parsed) {
      return parsed;
    }
  }

  // Chat pushes predate the route field in some builds; the conversation id
  // alone is enough to open the right thread.
  const conversationId = String(data?.conversationId ?? '').trim();
  if (conversationId) {
    return {route: 'chat.conversation', params: {conversationId}};
  }

  return INBOX_TARGET;
};

/**
 * The navigation instruction for a target: which tab, which screen, which
 * params. Kept as data so the navigator stays the only thing that knows about
 * React Navigation.
 */
export const navigationForTarget = (
  target: DeepLinkTarget,
): {tab: string; screen: string; params?: Record<string, string>} => {
  switch (target.route) {
    case 'chat.conversation':
      return {
        tab: 'ChatsTab',
        screen: 'Conversation',
        params: {conversationId: target.params.conversationId},
      };
    case 'chat.list':
      return {tab: 'ChatsTab', screen: 'ChatList'};
    case 'community.list':
      return {tab: 'CommunitiesTab', screen: 'CommunitiesHome'};
    case 'community.detail':
      return {
        tab: 'CommunitiesTab',
        screen: 'CommunityDetail',
        params: {communityId: target.params.communityId},
      };
    case 'community.chat':
      return {
        tab: 'CommunitiesTab',
        screen: 'CommunityChat',
        params: {communityId: target.params.communityId},
      };
    case 'rewards.home':
      return {tab: 'EarnTab', screen: 'EarnHome'};
    case 'support.ticket':
      return {
        tab: 'AiTab',
        screen: 'AiSupportThread',
        params: {ticketId: target.params.ticketId},
      };
    case 'notifications.inbox':
    default:
      return {tab: 'ProfileTab', screen: 'Notifications'};
  }
};
