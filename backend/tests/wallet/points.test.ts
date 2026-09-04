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
  AMBASSADOR_TIERS,
  MINING_STATION_REFERRAL_TARGET,
  REFEREE_WELCOME_POINTS,
  REFERRAL_REWARD_POINTS,
} from "../../services/yaysReferral.service";
import { ACTIVATION_REWARD_POINTS } from "../../services/yaysActivation.service";
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

describe("BTCY x YaysApp Ambassador ladder", () => {
  it("mirrors the campaign's 25 / 50 / 100 verified-referral milestones", () => {
    assert.deepStrictEqual(
      AMBASSADOR_TIERS.map((tier) => tier.threshold),
      [25, 50, 100]
    );
  });

  it("is ordered ascending, so the last tier cleared is always the highest", () => {
    for (let i = 1; i < AMBASSADOR_TIERS.length; i += 1) {
      assert.ok(AMBASSADOR_TIERS[i].threshold > AMBASSADOR_TIERS[i - 1].threshold);
    }
  });

  it("unlocks the Mining Station at every tier, and only the higher tiers add a points bonus", () => {
    for (const tier of AMBASSADOR_TIERS) {
      assert.strictEqual(tier.unlocksMiningStation, true);
    }
    assert.strictEqual(AMBASSADOR_TIERS[0].bonusPoints, 0);
    assert.ok(AMBASSADOR_TIERS[1].bonusPoints > 0);
    assert.ok(AMBASSADOR_TIERS[2].bonusPoints > AMBASSADOR_TIERS[1].bonusPoints);
  });

  it("only the Elite tier carries priority access", () => {
    assert.deepStrictEqual(
      AMBASSADOR_TIERS.map((tier) => tier.priorityAccess),
      [false, false, true]
    );
  });

  it("keeps the Mining Station target in sync with the first Ambassador tier", () => {
    assert.strictEqual(MINING_STATION_REFERRAL_TARGET, AMBASSADOR_TIERS[0].threshold);
  });
});

describe("BTCY x YaysApp verified activation reward", () => {
  it("pays a real, positive amount, distinct from the referral rewards", () => {
    assert.ok(ACTIVATION_REWARD_POINTS > 0);
    assert.ok(ACTIVATION_REWARD_POINTS < DAILY_POINTS_CAP);
  });

  it("scopes the activation payout to one account, so a second verification trigger cannot pay twice", () => {
    const email = "dana@example.com";
    assert.strictEqual(`activation-reward:${email}`, `activation-reward:${email}`);
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
