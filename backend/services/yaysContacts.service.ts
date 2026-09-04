import { UserService } from "./user.service";
import { phoneLookupVariants } from "../helpers/phone";

/**
 * "Invite friends" — matching a device's phone contacts against YaysApp/Indexx
 * accounts, the WhatsApp-style "who's already here" step.
 *
 * The client sends only what it already has permission to read from the
 * user's own contact list (name, phones, emails), never raw device contact
 * ids or anything beyond that. This never stores what it's sent — it looks
 * up matches for one request and returns, so a client that doesn't call it
 * again has left nothing behind on this side.
 */

export interface DeviceContactInput {
  /** Client-assigned id for this contact — round-tripped so the app can map
   *  a match back to the exact contact card without re-sending PII. */
  localId: string;
  name?: string;
  phones?: string[];
  emails?: string[];
}

export interface MatchedContact {
  localId: string;
  name: string | null;
  email: string;
  username: string | null;
  profilePic: string | null;
  referralCode: string | null;
}

export interface ContactMatchResult {
  matched: MatchedContact[];
  /** Contacts with no YaysApp/Indexx account — the client's invite list. */
  unmatchedCount: number;
}

/** One request, one round trip — large enough for a real address book, small enough to keep the query bounded. */
export const MAX_CONTACTS_PER_REQUEST = 1000;

const lower = (value: unknown): string => String(value ?? "").trim().toLowerCase();

/** Narrow enough to stand in for `UserService` in tests with an in-memory list. */
export type ContactsUserLookup = Pick<UserService, "findSelect">;

export class YaysContactsService {
  private users: ContactsUserLookup;

  constructor(users?: ContactsUserLookup) {
    this.users = users ?? new UserService();
  }

  async match(viewerLower: string, contacts: DeviceContactInput[]): Promise<ContactMatchResult> {
    const capped = (Array.isArray(contacts) ? contacts : []).slice(0, MAX_CONTACTS_PER_REQUEST);

    // Build the lookup sets once, remembering which local contact(s) each
    // normalized phone/email variant came from, so one query plus one pass
    // over its results is enough to answer every contact in the batch.
    const phoneToLocalIds = new Map<string, Set<string>>();
    const emailToLocalIds = new Map<string, Set<string>>();

    for (const contact of capped) {
      const localId = String(contact?.localId || "");
      if (!localId) {
        continue;
      }
      for (const rawPhone of contact.phones || []) {
        for (const variant of phoneLookupVariants(rawPhone)) {
          if (!phoneToLocalIds.has(variant)) {
            phoneToLocalIds.set(variant, new Set());
          }
          phoneToLocalIds.get(variant)!.add(localId);
        }
      }
      for (const rawEmail of contact.emails || []) {
        const email = lower(rawEmail);
        if (!email || email === viewerLower) {
          continue;
        }
        if (!emailToLocalIds.has(email)) {
          emailToLocalIds.set(email, new Set());
        }
        emailToLocalIds.get(email)!.add(localId);
      }
    }

    const phoneValues = [...phoneToLocalIds.keys()];
    const emailValues = [...emailToLocalIds.keys()];

    if (phoneValues.length === 0 && emailValues.length === 0) {
      return { matched: [], unmatchedCount: capped.length };
    }

    const or: any[] = [];
    if (phoneValues.length) {
      or.push({ phone: { $in: phoneValues } });
    }
    if (emailValues.length) {
      or.push({ email: { $in: emailValues } });
    }

    const users = await this.users.findSelect(
      { $or: or },
      { email: 1, phone: 1, username: 1, firstName: 1, lastName: 1, profilePic: 1, referralCode: 1 }
    );

    const matchedLocalIds = new Set<string>();
    const matched: MatchedContact[] = [];

    for (const user of users as any[]) {
      const email = lower(user.email);
      if (!email || email === viewerLower) {
        continue;
      }

      const localIds = new Set<string>();
      emailToLocalIds.get(email)?.forEach((id) => localIds.add(id));
      for (const variant of phoneLookupVariants(user.phone)) {
        phoneToLocalIds.get(variant)?.forEach((id) => localIds.add(id));
      }

      const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

      for (const localId of localIds) {
        // A contact can carry several numbers that all resolve to the same
        // account (a landline and a mobile, say) — only the first match for
        // that contact counts, so a person is not invited-looking twice.
        if (matchedLocalIds.has(localId)) {
          continue;
        }
        matchedLocalIds.add(localId);
        matched.push({
          localId,
          name: name || user.username || null,
          email,
          username: user.username || null,
          profilePic: user.profilePic || null,
          referralCode: user.referralCode || null,
        });
      }
    }

    return { matched, unmatchedCount: capped.length - matchedLocalIds.size };
  }
}

export const yaysContacts = new YaysContactsService();
