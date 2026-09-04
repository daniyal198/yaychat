import { ServiceBase } from "./base";
import referralSchema, { ReferralModel } from "../models/yaysReferral";
import { AmbassadorTier, Referral, ReferralStatus } from "../data/yaysWallet";
import { PointsAccountService, yaysPoints } from "./yaysPoints.service";
import { UserService } from "./user.service";
import { notificationDelivery } from "./notificationDelivery.service";
import { buildDeepLink } from "./notifications/deepLinks";

/** Points paid to the referrer once a referee qualifies. */
export const REFERRAL_REWARD_POINTS = 250;
/** Welcome bonus paid to the person who signed up with a code. */
export const REFEREE_WELCOME_POINTS = 100;

/**
 * BTCY × YaysApp Ambassador ladder ("Migration Reward System", Sept 2026).
 *
 * Verified-referral milestones from the BTCY × YaysApp community growth
 * campaign. `threshold` is verified referrals (`statsFor().active`); tiers are
 * ordered ascending so the last one a referrer clears is their current tier.
 * The 25-referral tier is what unlocks the BTCY Mining Station — everything
 * past that is a bonus on top of the station, not a replacement for it.
 */
export const AMBASSADOR_TIERS: {
  tier: AmbassadorTier;
  threshold: number;
  label: string;
  bonusPoints: number;
  unlocksMiningStation: boolean;
  priorityAccess: boolean;
}[] = [
  {
    tier: "community",
    threshold: 25,
    label: "Community Ambassador",
    bonusPoints: 0,
    unlocksMiningStation: true,
    priorityAccess: false,
  },
  {
    tier: "growth",
    threshold: 50,
    label: "Growth Ambassador",
    bonusPoints: 500,
    unlocksMiningStation: true,
    priorityAccess: false,
  },
  {
    tier: "elite",
    threshold: 100,
    label: "Elite Ambassador",
    bonusPoints: 1500,
    unlocksMiningStation: true,
    priorityAccess: true,
  },
];

/** Referral counts that unlock the BTCY Mining Station — the first Ambassador tier. */
export const MINING_STATION_REFERRAL_TARGET = AMBASSADOR_TIERS[0].threshold;

const isDuplicateKeyError = (error: any): boolean =>
  error?.code === 11000 || error?.code === 11001;

export class ReferralAlreadyAttributedError extends Error {
  constructor() {
    super("This account has already been attributed to a referrer.");
    this.name = "ReferralAlreadyAttributedError";
  }
}

export class InvalidReferralCodeError extends Error {
  constructor() {
    super("That invite code is not valid.");
    this.name = "InvalidReferralCodeError";
  }
}

export class SelfReferralError extends Error {
  constructor() {
    super("You cannot use your own invite code.");
    this.name = "SelfReferralError";
  }
}

export class YaysReferralService extends ServiceBase<Referral, ReferralModel> {
  private accounts = new PointsAccountService();
  private users = new UserService();

  constructor() {
    super(referralSchema, "YaysReferral");
  }

  /**
   * Resolve a code to its owner, checking the Indexx user table as well.
   *
   * YaysApp shares Indexx's referral codes, so a code printed by the exchange
   * or the Bitcoin Yay app must work when typed into YaysApp — a user does not
   * know or care which product minted the code they were given.
   */
  private async ownerOfCode(code: string): Promise<string | null> {
    const normalized = String(code || "").trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    const account = await this.accounts.byCode(normalized);
    if (account) {
      return account.userLower;
    }
    try {
      const user: any = await this.users.findOneSelect(
        { referralCode: normalized },
        { email: 1 }
      );
      const email = String(user?.email || "").trim().toLowerCase();
      return email || null;
    } catch (error) {
      console.error("[yays/referrals] Indexx code lookup failed", error);
      return null;
    }
  }

  /**
   * Mirror the attribution onto the Indexx user record.
   *
   * `referralCodeUsed` is what the BTCY Mining Station counts, so without this
   * a friend invited through YaysApp would earn IndexxPoints but never move the
   * mining-station progress bar. Only ever *sets* an empty field: overwriting
   * an existing attribution would re-assign a referral someone was already paid
   * for.
   */
  private async mirrorToIndexx(refereeLower: string, code: string): Promise<void> {
    try {
      await this.users.updatePart(
        {
          email: refereeLower,
          $or: [
            { referralCodeUsed: { $exists: false } },
            { referralCodeUsed: null },
            { referralCodeUsed: "" },
          ],
        },
        { $set: { referralCodeUsed: code } }
      );
    } catch (error) {
      // A failure here costs the referrer mining credit but must not fail the
      // redemption — the IndexxPoints side has already been recorded.
      console.error("[yays/referrals] could not mirror attribution to Indexx", error);
    }
  }

  /**
   * Attribute a new account to the owner of `code`.
   *
   * Called once, at signup. Attribution is recorded as `pending`: the referrer
   * is not paid until the referee proves they are a real person
   * (`qualify`), because a signup on its own costs an attacker nothing.
   */
  async attribute(input: {
    refereeLower: string;
    code: string;
    source?: string;
  }): Promise<Referral> {
    const normalizedCode = String(input.code || "").trim().toUpperCase();
    const referrerLower = await this.ownerOfCode(normalizedCode);
    if (!referrerLower) {
      throw new InvalidReferralCodeError();
    }
    if (referrerLower === input.refereeLower) {
      throw new SelfReferralError();
    }

    try {
      const referral = await this.create({
        referrerLower,
        refereeLower: input.refereeLower,
        code: normalizedCode,
        status: "pending",
        rewardAmount: 0,
        source: input.source ?? null,
      } as Referral);

      await this.mirrorToIndexx(input.refereeLower, normalizedCode);

      // The welcome bonus is safe to pay immediately: it lands on the *new*
      // account, so a fake signup only ever pays itself, and the daily cap
      // still applies.
      await yaysPoints.credit({
        userLower: input.refereeLower,
        amount: REFEREE_WELCOME_POINTS,
        reason: "referral_signup",
        activity: "Welcome bonus",
        idempotencyKey: `referral-welcome:${input.refereeLower}`,
        countsTowardDailyCap: false,
        meta: { referrer: referrerLower, code: normalizedCode },
      });

      return referral;
    } catch (error: any) {
      if (isDuplicateKeyError(error)) {
        throw new ReferralAlreadyAttributedError();
      }
      throw error;
    }
  }

  /**
   * Mark a referee as real and pay the referrer.
   *
   * Call this from the moment the referee becomes a genuine member — verified
   * phone/email plus first real activity. Idempotent: the conditional filter
   * means only the first call transitions the row, so the payout runs once.
   */
  async qualify(refereeLower: string, reason: string): Promise<Referral | null> {
    const settled = await this.findOneUpdate(
      { refereeLower, status: "pending" },
      {
        $set: {
          status: "qualified",
          qualifiedAt: new Date(),
          rejectedReason: null,
        },
      },
      { new: true }
    );
    if (!settled) {
      return null;
    }

    const credit = await yaysPoints.credit({
      userLower: settled.referrerLower,
      amount: REFERRAL_REWARD_POINTS,
      reason: "referral_milestone",
      activity: "Referral reward",
      idempotencyKey: `referral-reward:${refereeLower}`,
      countsTowardDailyCap: false,
      note: reason,
      meta: { referee: refereeLower, code: settled.code },
    });

    const rewarded = await this.findOneUpdate(
      { refereeLower },
      {
        $set: {
          status: "rewarded",
          rewardAmount: credit.entry.amount,
          rewardedAt: new Date(),
        },
      },
      { new: true }
    );

    // The referrer is usually not the one who just did something — their
    // friend was the one verifying — so a push is the only way they find out.
    if (!credit.duplicate) {
      await notificationDelivery
        .deliver({
          userLower: settled.referrerLower,
          category: "rewards",
          title: "Referral reward earned",
          body: `You earned ${REFERRAL_REWARD_POINTS} IndexxPoints — your invite just qualified.`,
          deepLink: buildDeepLink("rewards.referral", {}) ?? undefined,
          dedupeKey: `referral-reward:${refereeLower}`,
        })
        .catch((error) =>
          console.error("[yays/referrals] reward notification failed", error)
        );
    }

    await this.grantAmbassadorTiers(settled.referrerLower);

    return rewarded;
  }

  /**
   * Advance the referrer's BTCY × YaysApp Ambassador tier, if their verified
   * referral count now clears a new one, and pay its one-time bonus.
   *
   * Runs every time a referral qualifies, but each tier's bonus can only ever
   * be paid once — `credit`'s idempotency key is keyed on the tier, not the
   * triggering referral — and a tier already reached is never paid twice even
   * though every later `qualify()` call re-checks it. Tiers are walked in
   * ascending order so `ambassadorTier` ends on the highest one cleared.
   *
   * The notification is gated on `currentRank`, read once before the loop —
   * not on the credit's own idempotency — because the community tier carries
   * no points credit to key off, and re-sending "tier unlocked" on every later
   * referral would be as wrong as never sending it at all.
   */
  private async grantAmbassadorTiers(referrerLower: string): Promise<void> {
    const [stats, account] = await Promise.all([
      this.statsFor(referrerLower),
      this.accounts.ensure(referrerLower),
    ]);
    const currentRank = AMBASSADOR_TIERS.findIndex(
      (t) => t.tier === account.ambassadorTier
    );

    for (let rank = 0; rank < AMBASSADOR_TIERS.length; rank += 1) {
      const tier = AMBASSADOR_TIERS[rank];
      if (stats.active < tier.threshold) {
        continue;
      }
      if (tier.bonusPoints > 0) {
        await yaysPoints.credit({
          userLower: referrerLower,
          amount: tier.bonusPoints,
          reason: "ambassador_bonus",
          activity: `${tier.label} bonus`,
          idempotencyKey: `ambassador-tier:${tier.tier}:${referrerLower}`,
          countsTowardDailyCap: false,
          meta: { tier: tier.tier, verifiedReferrals: stats.active },
        });
      }
      await this.accounts.updatePart(
        { userLower: referrerLower },
        { $set: { ambassadorTier: tier.tier, ambassadorTierAt: new Date() } }
      );
      if (rank > currentRank) {
        await notificationDelivery
          .deliver({
            userLower: referrerLower,
            category: "rewards",
            title: `${tier.label} unlocked!`,
            body:
              tier.bonusPoints > 0
                ? `You reached ${tier.threshold} verified referrals — Mining Station + ${tier.bonusPoints} IndexxPoints.`
                : `You reached ${tier.threshold} verified referrals — Mining Station Ownership unlocked.`,
            deepLink: buildDeepLink("rewards.referral", {}) ?? undefined,
            dedupeKey: `ambassador-tier:${tier.tier}:${referrerLower}`,
          })
          .catch((error) =>
            console.error("[yays/referrals] ambassador notification failed", error)
          );
      }
    }
  }

  async reject(refereeLower: string, rejectedReason: string): Promise<Referral | null> {
    return this.findOneUpdate(
      { refereeLower, status: { $in: ["pending", "qualified"] } },
      { $set: { status: "rejected", rejectedReason } },
      { new: true }
    );
  }

  async listFor(referrerLower: string, limit = 100): Promise<Referral[]> {
    return this.findPaginatedSkip(limit, 0, { createdAt: -1 }, { referrerLower }, {});
  }

  async referralOf(refereeLower: string): Promise<Referral | null> {
    return (await this.findOne({ refereeLower })) || null;
  }

  /** Counts the Earn tab and the BTCY station-unlock rule both read. */
  async statsFor(referrerLower: string): Promise<{
    total: number;
    pending: number;
    active: number;
    pointsEarned: number;
  }> {
    const rows = await this.find({ referrerLower });
    const active = rows.filter(
      (r) => r.status === "qualified" || r.status === "rewarded"
    );
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      active: active.length,
      pointsEarned: active.reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    };
  }
}

export const yaysReferrals = new YaysReferralService();
export type { ReferralStatus };
