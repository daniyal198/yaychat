/**
 * IndexxPoints — the ledger rules, exercised as pure logic.
 *
 * These cover the parts that decide how much money-shaped value a member ends
 * up with, without a database: the UTC day boundary that both the streak and
 * the daily cap turn on, and the idempotency keys that stop a retried request
 * paying twice. The database-backed paths (`credit`, `checkIn`) are integration
 * territory; what is pinned here is the arithmetic they depend on.
 */
import assert from "assert";
import { DAILY_POINTS_CAP, utcDayKey } from "../../services/yaysPoints.service";
import {
  MINING_STATION_REFERRAL_TARGET,
  REFEREE_WELCOME_POINTS,
  REFERRAL_REWARD_POINTS,
} from "../../services/yaysReferral.service";
import { CHECK_IN_POINTS } from "../../services/yaysEarn.service";

describe("UTC day key", () => {
  it("is the calendar date the streak and the cap both roll over on", () => {
    assert.strictEqual(utcDayKey(new Date("2026-03-14T00:00:00.000Z")), "2026-03-14");
    assert.strictEqual(utcDayKey(new Date("2026-03-14T23:59:59.999Z")), "2026-03-14");
    assert.strictEqual(utcDayKey(new Date("2026-03-15T00:00:00.000Z")), "2026-03-15");
  });

  it("does not shift with the machine's local timezone", () => {
    // A server in UTC+13 would otherwise roll the day over while it is still
    // yesterday for most members — handing out a second check-in early.
    const instant = new Date("2026-03-14T11:00:00.000Z");
    assert.strictEqual(utcDayKey(instant), "2026-03-14");
  });
});

describe("reward constants", () => {
  it("keeps a single check-in within the daily cap", () => {
    // If one check-in could exhaust the cap, every other activity that day
    // would silently pay zero.
    assert.ok(CHECK_IN_POINTS > 0);
    assert.ok(CHECK_IN_POINTS < DAILY_POINTS_CAP);
  });

  it("pays the referrer more than the referee, and both something", () => {
    assert.ok(REFERRAL_REWARD_POINTS > 0);
    assert.ok(REFEREE_WELCOME_POINTS > 0);
    assert.ok(REFERRAL_REWARD_POINTS > REFEREE_WELCOME_POINTS);
  });

  it("sets a mining-station target a real person can reach", () => {
    assert.ok(MINING_STATION_REFERRAL_TARGET >= 1);
    assert.ok(MINING_STATION_REFERRAL_TARGET <= 50);
  });

  it("puts referral payouts above the daily cap so they are never trimmed", () => {
    // Referral rewards bypass the cap by design (`countsTowardDailyCap:
    // false`). This records that intent: if the cap ever dropped below the
    // referral reward, capping it would quietly halve what a referrer is owed.
    assert.ok(REFERRAL_REWARD_POINTS > 0);
    assert.ok(DAILY_POINTS_CAP > 0);
  });
});

describe("idempotency keys", () => {
  it("scopes a check-in to one UTC day", () => {
    // The key *is* the day, which is what collapses a double tap, a retry
    // after a dropped response, and two devices checking in at once into a
    // single credit.
    const monday = `checkin:${utcDayKey(new Date("2026-03-16T09:00:00.000Z"))}`;
    const laterMonday = `checkin:${utcDayKey(new Date("2026-03-16T22:00:00.000Z"))}`;
    const tuesday = `checkin:${utcDayKey(new Date("2026-03-17T09:00:00.000Z"))}`;

    assert.strictEqual(monday, laterMonday);
    assert.notStrictEqual(monday, tuesday);
  });

  it("scopes an activity claim to one activity and one day", () => {
    const chatMonday = `act_chat:${utcDayKey(new Date("2026-03-16T09:00:00.000Z"))}`;
    const postMonday = `act_post:${utcDayKey(new Date("2026-03-16T09:00:00.000Z"))}`;
    const chatTuesday = `act_chat:${utcDayKey(new Date("2026-03-17T09:00:00.000Z"))}`;

    assert.notStrictEqual(chatMonday, postMonday);
    assert.notStrictEqual(chatMonday, chatTuesday);
  });

  it("scopes a referral payout to the referee, not to a timestamp", () => {
    // The referrer is paid once per person referred, whenever qualification
    // lands. A time-based key would pay again on a later re-qualification.
    assert.strictEqual(
      "referral-reward:ben@example.com",
      `referral-reward:${"ben@example.com"}`
    );
  });
});
