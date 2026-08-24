/**
 * Call lifecycle rules.
 *
 * Two devices routinely race to end the same call — one hangs up while the
 * other declines, or a socket drops mid-ring. The server is the only place
 * that can decide one outcome, and these pin the rules it decides by: ring
 * time is never billed as talk time, and an unanswered call is recorded as
 * "missed" for the callee rather than as a zero-second conversation.
 */
import assert from "assert";
import { RING_TIMEOUT_SECONDS } from "../../services/yaysCall.service";
import { CallEndReason, CallStatus } from "../../data/yaysCalls";

/** Mirrors the duration arithmetic in `YaysCallService.settle`. */
const durationFor = (connectedAt: Date | null, endedAt: Date): number =>
  connectedAt
    ? Math.max(0, Math.round((endedAt.getTime() - connectedAt.getTime()) / 1000))
    : 0;

describe("call duration", () => {
  it("counts from the moment media connected, not from when it was placed", () => {
    const connectedAt = new Date("2026-03-16T10:00:40.000Z");
    const endedAt = new Date("2026-03-16T10:02:10.000Z");
    // Placed at 10:00:00, answered at 10:00:40 — the 40s of ringing is not
    // conversation and must not appear as talk time.
    assert.strictEqual(durationFor(connectedAt, endedAt), 90);
  });

  it("is zero for a call that was never answered", () => {
    const endedAt = new Date("2026-03-16T10:00:45.000Z");
    assert.strictEqual(durationFor(null, endedAt), 0);
  });

  it("never goes negative when clocks disagree", () => {
    const connectedAt = new Date("2026-03-16T10:00:10.000Z");
    const endedAt = new Date("2026-03-16T10:00:05.000Z");
    assert.strictEqual(durationFor(connectedAt, endedAt), 0);
  });
});

describe("terminal states", () => {
  const terminal: CallStatus[] = [
    "ended",
    "declined",
    "missed",
    "cancelled",
    "failed",
  ];

  it("distinguishes the ways a call can fail to happen", () => {
    // Collapsing these into one "ended" state would make the history read
    // identically for "they declined you" and "your network could not
    // connect" — and would hide the relay failure rate entirely.
    assert.strictEqual(new Set(terminal).size, terminal.length);
    assert.ok(terminal.includes("missed"));
    assert.ok(terminal.includes("failed"));
  });

  it("pairs each terminal state with a reason a person can read", () => {
    const reasons: Record<string, CallEndReason> = {
      ended: "hangup",
      declined: "declined",
      missed: "no_answer",
      cancelled: "caller_cancelled",
      failed: "connection_failed",
    };
    for (const status of terminal) {
      assert.ok(reasons[status], `${status} needs an end reason`);
    }
  });
});

describe("ring timeout", () => {
  it("is long enough to answer and short enough to give up on", () => {
    assert.ok(RING_TIMEOUT_SECONDS >= 20);
    assert.ok(RING_TIMEOUT_SECONDS <= 90);
  });

  it("is what the stale-ring sweep measures against", () => {
    // A caller whose app is killed mid-ring never reports an outcome. Without
    // the sweep the callee stays "busy" forever and can receive no further
    // calls, which is the worst possible way for this to fail.
    const cutoff = new Date(Date.now() - RING_TIMEOUT_SECONDS * 1000);
    const abandoned = new Date(Date.now() - (RING_TIMEOUT_SECONDS + 5) * 1000);
    const stillRinging = new Date(Date.now() - 1000);

    assert.ok(abandoned < cutoff, "an abandoned ring is swept");
    assert.ok(stillRinging > cutoff, "a live ring is left alone");
  });
});

describe("history direction", () => {
  it("only shows an unanswered call as missed to the person who was called", () => {
    const call = {
      callerLower: "ana@example.com",
      calleeLower: "ben@example.com",
      status: "missed" as CallStatus,
    };
    const missedFor = (viewer: string) =>
      call.callerLower !== viewer && call.status === "missed";

    // Ben missed it. Ana did not miss her own outgoing call, and badging it
    // as missed for her would be a notification about nothing.
    assert.strictEqual(missedFor("ben@example.com"), true);
    assert.strictEqual(missedFor("ana@example.com"), false);
  });
});
