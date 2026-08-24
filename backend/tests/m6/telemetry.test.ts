/**
 * Module 6 — analytics catalogue and crash grouping.
 *
 * These are the rules that keep the pipeline queryable and private: an event
 * allowlist, a property whitelist with no free-text escape hatch, and a
 * fingerprint that groups one defect into one row across builds.
 */
import assert from "assert";
import {
  EVENT_CATALOG,
  isKnownEvent,
  safeCountKey,
  sanitizeProps,
  utcDay,
} from "../../services/analytics/eventCatalog";
import { fingerprintOf } from "../../services/crashReport.service";

describe("M6 event catalogue", () => {
  it("accepts declared events and rejects everything else", () => {
    assert.strictEqual(isKnownEvent("message_sent"), true);
    assert.strictEqual(isKnownEvent("wallet_balance_viewed"), false);
    assert.strictEqual(isKnownEvent(""), false);
  });

  it("keeps only the properties an event declares", () => {
    const props = sanitizeProps("message_sent", {
      kind: "text",
      hasAttachment: false,
      // Not declared — a mis-wired call site must not be able to smuggle this
      // through, which is the whole point of the whitelist.
      messageBody: "meet me at 8",
    });
    assert.deepStrictEqual(props, { kind: "text", hasAttachment: false });
  });

  it("drops non-scalar values rather than storing structures", () => {
    const props = sanitizeProps("screen_view", {
      name: { nested: "object" },
    });
    assert.deepStrictEqual(props, {});
  });

  it("truncates long strings so a declared prop cannot carry a payload", () => {
    const props = sanitizeProps("screen_view", { name: "x".repeat(500) });
    assert.strictEqual((props.name as string).length, 120);
  });

  it("returns nothing for an unknown event", () => {
    assert.deepStrictEqual(sanitizeProps("not_an_event", { a: 1 }), {});
  });

  it("declares no free-text property anywhere in the catalogue", () => {
    for (const [name, spec] of Object.entries(EVENT_CATALOG)) {
      for (const prop of spec.props) {
        assert.ok(
          !/(body|text|content|message$|query|email|token)/i.test(prop),
          `${name}.${prop} looks like free text`
        );
      }
    }
  });

  it("partitions by UTC day", () => {
    assert.strictEqual(utcDay(new Date("2026-08-15T23:59:59Z")), "2026-08-15");
    assert.strictEqual(utcDay(new Date("2026-08-16T00:00:01Z")), "2026-08-16");
  });

  it("escapes characters Mongo rejects in map keys", () => {
    assert.strictEqual(safeCountKey("a.b$c"), "a_b_c");
  });
});

describe("M6 crash fingerprinting", () => {
  const stack = [
    "TypeError: undefined is not a function",
    "    at ChatScreen (/app/src/yaychat/screens/chats/ChatScreens.tsx:412:19)",
    "    at renderWithHooks (/app/node_modules/react/index.js:1200:7)",
  ].join("\n");

  it("is stable for the same defect", () => {
    assert.strictEqual(
      fingerprintOf("TypeError", "undefined is not a function", stack),
      fingerprintOf("TypeError", "undefined is not a function", stack)
    );
  });

  // Line numbers move every release; the same bug must not split into a new
  // group each build.
  it("ignores line and column numbers", () => {
    const shifted = stack.replace(":412:19", ":455:23");
    assert.strictEqual(
      fingerprintOf("TypeError", "undefined is not a function", stack),
      fingerprintOf("TypeError", "undefined is not a function", shifted)
    );
  });

  // Interpolated ids in messages would otherwise fragment one defect into
  // thousands of groups.
  it("ignores the message text", () => {
    assert.strictEqual(
      fingerprintOf("TypeError", "user 42 not found", stack),
      fingerprintOf("TypeError", "user 99 not found", stack)
    );
  });

  it("separates different error types", () => {
    assert.notStrictEqual(
      fingerprintOf("TypeError", "boom", stack),
      fingerprintOf("RangeError", "boom", stack)
    );
  });

  it("separates different call sites", () => {
    const elsewhere = stack.replace("ChatScreen", "ProfileScreen");
    assert.notStrictEqual(
      fingerprintOf("TypeError", "boom", stack),
      fingerprintOf("TypeError", "boom", elsewhere)
    );
  });

  it("handles a crash with no stack", () => {
    const fingerprint = fingerprintOf("Error", "no stack", "");
    assert.strictEqual(typeof fingerprint, "string");
    assert.strictEqual(fingerprint.length, 16);
  });
});
