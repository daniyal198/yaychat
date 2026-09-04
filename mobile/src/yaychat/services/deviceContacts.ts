/**
 * The device address book, wrapped so the rest of the app only ever deals
 * with a plain contact shape and a small permission-state enum — never
 * `react-native-contacts` directly.
 *
 * Reading is best-effort throughout: a native module hiccup or a mid-flow
 * permission revoke degrades to an empty list rather than crashing the Invite
 * screen, since "no contacts found" is a state that screen already renders.
 */
import {Linking} from 'react-native';
import Contacts, {Contact} from 'react-native-contacts';

/**
 * `undetermined` (never asked) is kept distinct from `denied` (asked and
 * refused) — showing "open Settings to allow contacts" before the system
 * prompt has ever appeared would be a confusing, premature dead end.
 */
export type ContactsPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const toStatus = (native: string): ContactsPermissionStatus => {
  if (native === 'authorized' || native === 'limited') {
    return 'granted';
  }
  if (native === 'undefined') {
    return 'undetermined';
  }
  return 'denied';
};

export interface DeviceContact {
  /** The native `recordID` — stable enough to round-trip through the match API. */
  localId: string;
  name: string;
  phones: string[];
  emails: string[];
}

const toDeviceContact = (contact: Contact, index: number): DeviceContact => {
  const name =
    [contact.givenName, contact.familyName].filter(Boolean).join(' ').trim() ||
    contact.displayName ||
    'Contact';
  return {
    localId: contact.recordID || `contact-${index}`,
    name,
    phones: (contact.phoneNumbers || []).map(p => p.number).filter(Boolean),
    emails: (contact.emailAddresses || []).map(e => e.email).filter(Boolean),
  };
};

export const deviceContacts = {
  async permissionStatus(): Promise<ContactsPermissionStatus> {
    try {
      return toStatus(await Contacts.checkPermission());
    } catch {
      return 'unavailable';
    }
  },

  async requestPermission(): Promise<ContactsPermissionStatus> {
    try {
      return toStatus(await Contacts.requestPermission());
    } catch {
      return 'unavailable';
    }
  },

  /** The full address book, normalized. Empty once permission isn't granted — never throws. */
  async readAll(): Promise<DeviceContact[]> {
    let raw: Contact[];
    try {
      raw = await Contacts.getAll();
    } catch {
      return [];
    }
    return raw
      .map(toDeviceContact)
      .filter(c => c.phones.length > 0 || c.emails.length > 0);
  },

  /** iOS/Android app-settings deep link, for a member who denied permission and wants to reconsider. */
  openSettings(): void {
    Linking.openSettings().catch(() => undefined);
  },
};
