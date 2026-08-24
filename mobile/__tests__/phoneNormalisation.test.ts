/**
 * Phone-number normalisation.
 *
 * The failure this prevents is silent and total: a member registers as
 * `+923001234567`, later types `0300 1234567`, and every phone lookup — sign
 * in, OTP, contact discovery — reports their own number as unregistered. The
 * account exists and the password is right; the two strings simply are not
 * equal. Canonical E.164 on every boundary is what makes them one identity.
 *
 * Mirrors `backend/helpers/phone.ts`, which normalises the same way on the
 * server. Both sides have to agree or the round trip still fails.
 */
import {formatPhone, isValidPhone, parsePhone, toE164} from '../src/yaychat/utils/phone';

describe('parsePhone', () => {
  it('canonicalises every spelling of one number to the same E.164', () => {
    const spellings = [
      '+923001234567',
      '+92 300 1234567',
      '+92 (300) 123-4567',
      '  +92 300 1234567  ',
    ];
    const parsed = spellings.map(value => parsePhone(value).e164);
    expect(new Set(parsed).size).toBe(1);
    expect(parsed[0]).toBe('+923001234567');
  });

  it('drops the national trunk prefix, which is where regex fixes go wrong', () => {
    // `0300…` national and `+92 300…` international are the same line. The
    // leading zero is a national trunk prefix whose rule differs per country —
    // dropping it correctly is why this delegates to a real library rather
    // than stripping characters.
    expect(parsePhone('+92 0300 1234567').e164).toBe('+923001234567');
    expect(parsePhone('+92 300 1234567').e164).toBe('+923001234567');

    // A UK mobile written nationally behind its country code, same rule.
    expect(parsePhone('+44 07400 123456').e164).toBe('+447400123456');
  });

  it('asks for a country code rather than guessing one', () => {
    // Inferring the region from the device locale produces a *different, valid*
    // number for a traveller on a foreign SIM — they would verify someone
    // else's line with no way to notice.
    const result = parsePhone('3001234567');
    expect(result.e164).toBeNull();
    expect(result.error).toMatch(/country code/i);
  });

  it('rejects an empty number with an actionable message', () => {
    const result = parsePhone('   ');
    expect(result.e164).toBeNull();
    expect(result.error).toBeTruthy();
  });

  it('rejects a number that is the right shape but not dialable', () => {
    expect(parsePhone('+1 000 000 0000').e164).toBeNull();
  });

  it('accepts numbers across regions', () => {
    expect(parsePhone('+44 7400 123456').e164).toBe('+447400123456');
    expect(parsePhone('+1 415 555 0117').e164).toBe('+14155550117');
    expect(parsePhone('+81 90 1234 5678').e164).toBe('+819012345678');
  });
});

describe('toE164', () => {
  it('returns the trimmed input when the number cannot be parsed', () => {
    // Callers use this for display and for legacy rows; throwing here would
    // break screens that only need to echo whatever is stored.
    expect(toE164('not a number')).toBe('not a number');
    expect(toE164('')).toBe('');
    expect(toE164(null)).toBe('');
  });
});

describe('formatPhone', () => {
  it('renders a readable international form', () => {
    expect(formatPhone('+14155550117')).toBe('+1 415 555 0117');
  });

  it('passes unparseable values through unchanged', () => {
    expect(formatPhone('pending')).toBe('pending');
  });
});

describe('isValidPhone', () => {
  it('agrees with parsePhone', () => {
    expect(isValidPhone('+14155550117')).toBe(true);
    expect(isValidPhone('4155550117')).toBe(false);
  });
});
