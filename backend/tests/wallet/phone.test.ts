/**
 * Phone-number normalisation on the server.
 *
 * Mirrors `mobile/__tests__/phoneNormalisation.test.ts`. Both sides have to
 * canonicalise identically, or a number the client sends as `+923001234567`
 * is stored or looked up as something else and the account becomes
 * unreachable through its own phone number.
 */
import assert from "assert";
import {
  isValidPhone,
  normalizePhoneLoose,
  phoneLookupVariants,
  phoneQuery,
  toE164,
} from "../../helpers/phone";

describe("toE164", () => {
  it("canonicalises every spelling of one number", () => {
    const spellings = [
      "+923001234567",
      "+92 300 1234567",
      "+92 (300) 123-4567",
      "  +92 300 1234567  ",
    ];
    const canonical = new Set(spellings.map((value) => toE164(value)));
    assert.strictEqual(canonical.size, 1);
    assert.strictEqual([...canonical][0], "+923001234567");
  });

  it("drops the national trunk prefix", () => {
    // The leading zero in `0300…` is national notation; its rule differs per
    // country, which is why this delegates to a real library.
    assert.strictEqual(toE164("0300 1234567", "PK"), "+923001234567");
    assert.strictEqual(toE164("07400 123456", "GB"), "+447400123456");
  });

  it("uses the supplied region for a number typed without a country code", () => {
    assert.strictEqual(toE164("415 555 0117", "US"), "+14155550117");
  });

  it("returns null rather than echoing an unparseable value back", () => {
    // Writing an unparseable string into the phone field is what creates the
    // duplicate-account problem this module exists to prevent.
    assert.strictEqual(toE164("not a number"), null);
    assert.strictEqual(toE164(""), null);
    assert.strictEqual(toE164(null), null);
    assert.strictEqual(toE164("+1 000 000 0000"), null);
  });
});

describe("phoneLookupVariants", () => {
  it("includes every form a legacy row might already hold", () => {
    const variants = phoneLookupVariants("+92 300 1234567");
    // Rows written before normalisation existed can hold any of these, and a
    // member must never be told their own number is unregistered.
    assert.ok(variants.includes("+923001234567"));
    assert.ok(variants.includes("923001234567"));
    assert.ok(variants.includes("3001234567"));
    assert.ok(variants.includes("03001234567"));
    assert.ok(variants.includes("+92 300 1234567"));
  });

  it("still returns the raw input when the number cannot be parsed", () => {
    const variants = phoneLookupVariants("weird-value");
    assert.ok(variants.includes("weird-value"));
  });

  it("builds a Mongo $in filter from those variants", () => {
    const query = phoneQuery("+14155550117");
    assert.ok(Array.isArray(query.$in));
    assert.ok(query.$in.includes("+14155550117"));
  });
});

describe("normalizePhoneLoose", () => {
  it("prefers E.164 and falls back to a digits-only form", () => {
    assert.strictEqual(normalizePhoneLoose("+92 300 1234567"), "+923001234567");
    assert.strictEqual(normalizePhoneLoose("12345"), "+12345");
    assert.strictEqual(normalizePhoneLoose(""), "");
  });
});

describe("isValidPhone", () => {
  it("agrees with toE164", () => {
    assert.strictEqual(isValidPhone("+14155550117"), true);
    assert.strictEqual(isValidPhone("not a number"), false);
  });

  it("falls back to the configured default region for country-code-less input", () => {
    // Older Indexx clients post national numbers with no `+`. The server
    // accepts them under `YAYS_DEFAULT_PHONE_REGION` (US unless configured)
    // rather than rejecting existing traffic. The YaysApp client is stricter
    // and always sends E.164, so it never relies on this.
    assert.strictEqual(isValidPhone("415 555 0117", "US"), true);
    assert.strictEqual(isValidPhone("0300 1234567", "PK"), true);
    // A number valid nowhere is still rejected.
    assert.strictEqual(isValidPhone("000", "US"), false);
  });
});
