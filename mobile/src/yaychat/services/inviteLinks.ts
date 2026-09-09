/**
 * Invite-link capture (BUG-003).
 *
 * `linkingConfig` only maps screens under `Main`, and `Main` mounts only for a
 * signed-in, onboarded session. The recipient of an invite is by definition
 * neither — so React Navigation matched nothing, the app opened on Welcome,
 * and the code the link existed to carry was thrown away.
 *
 * This captures the code off the incoming URL before routing gets a say, holds
 * it across sign-up, and hands it over once there is an account to attach it
 * to.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_INVITE_KEY = 'yaysapp.invite.pending.v1';

/** Codes are short and alphanumeric; anything else is not one of ours. */
const CODE_RE = /^[A-Z0-9]{4,16}$/;

const normalize = (value: string): string | null => {
  const code = value.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
};

/**
 * Pull an invite code out of a link.
 *
 * Accepts the path form the app shares (`/invite/CODE`) and the query forms a
 * web landing page is likely to bounce back (`?invite=` / `?code=` / `?ref=`),
 * on either the custom scheme or the https twin.
 */
export const parseInviteCode = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  const raw = String(url);
  const [pathPart, queryPart] = raw.split('?');

  const path = pathPart
    .replace(/^yaychat:\/\//i, '')
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
  const pathMatch = path.match(/^invite\/(.+)$/i);
  if (pathMatch) {
    const code = normalize(decodeURIComponent(pathMatch[1]));
    if (code) {
      return code;
    }
  }

  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (/^(invite|code|ref|referral)$/i.test(key)) {
        const code = normalize(decodeURIComponent(value));
        if (code) {
          return code;
        }
      }
    }
  }
  return null;
};

/**
 * Remember a code from an incoming link. Returns the code when one was found,
 * so the caller can react immediately if the app is already signed in.
 *
 * A later link wins: someone who taps a second invite meant the second one.
 */
export const capturePendingInviteCode = async (
  url: string | null | undefined,
): Promise<string | null> => {
  const code = parseInviteCode(url);
  if (!code) {
    return null;
  }
  await AsyncStorage.setItem(PENDING_INVITE_KEY, code).catch(() => undefined);
  return code;
};

export const pendingInviteCode = async (): Promise<string | null> => {
  try {
    const stored = await AsyncStorage.getItem(PENDING_INVITE_KEY);
    return stored ? normalize(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Read the held code and forget it in one step, so a code is only ever offered
 * once and a declined invite does not follow the user around.
 */
export const takePendingInviteCode = async (): Promise<string | null> => {
  const code = await pendingInviteCode();
  await clearPendingInviteCode();
  return code;
};

export const clearPendingInviteCode = async (): Promise<void> => {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => undefined);
};
