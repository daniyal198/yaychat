import {parsePhoneNumberFromString} from 'libphonenumber-js';

/**
 * Phone-number normalisation for the client.
 *
 * Mirrors `backend/helpers/phone.ts`: one canonical E.164 form
 * (`+923001234567`) is sent for signup, sign-in, OTP send, and OTP verify, so
 * the same person typing `0300 1234567` on one screen and `+92 300 1234567` on
 * another is recognised as the same account rather than being told their number
 * is not registered.
 *
 * A country code is **required** rather than inferred from the device locale.
 * Guessing the region silently produces a *different, valid* number — a
 * traveller with a foreign SIM would verify someone else's line — and there is
 * no way for the user to see that happened. Asking is the cheaper failure.
 */

export interface PhoneParseResult {
  /** Canonical E.164, or null when the input is not a valid number. */
  e164: string | null;
  /** User-facing reason, set only when `e164` is null. */
  error: string | null;
}

export const parsePhone = (value: string): PhoneParseResult => {
  const raw = String(value || '').trim();
  if (!raw) {
    return {e164: null, error: 'Enter your phone number.'};
  }
  if (!raw.startsWith('+')) {
    return {
      e164: null,
      error: 'Include your country code, for example +1 555 010 0199.',
    };
  }
  const parsed = parsePhoneNumberFromString(raw);
  if (!parsed || !parsed.isValid()) {
    return {e164: null, error: 'That phone number does not look right.'};
  }
  return {e164: parsed.number, error: null};
};

/** Canonical form, or the trimmed input when it cannot be parsed. */
export const toE164 = (value: unknown): string => {
  const raw = String(value || '').trim();
  const parsed = raw.startsWith('+') ? parsePhoneNumberFromString(raw) : null;
  return parsed?.isValid() ? parsed.number : raw;
};

/** Readable international form for display, e.g. "+92 300 1234567". */
export const formatPhone = (value: unknown): string => {
  const raw = String(value || '').trim();
  const parsed = raw.startsWith('+') ? parsePhoneNumberFromString(raw) : null;
  return parsed?.isValid() ? parsed.formatInternational() : raw;
};

export const isValidPhone = (value: string): boolean => parsePhone(value).e164 !== null;
