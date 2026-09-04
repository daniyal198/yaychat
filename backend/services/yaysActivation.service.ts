import { PointsAccountService, yaysPoints } from "./yaysPoints.service";
import { UserService } from "./user.service";
import { YaysCommunityMemberService } from "./yaysCommunityMember.service";
import { YaysCommunityService } from "./yaysCommunity.service";
import { yaysReferrals } from "./yaysReferral.service";
import { notificationDelivery } from "./notificationDelivery.service";
import { buildDeepLink } from "./notifications/deepLinks";

/**
 * BTCY × YaysApp "Verified Migration Reward" (a.k.a. the activation reward).
 *
 * One-time IndexxPoints payout, paid once per account, once both of the
 * campaign's gates are real:
 *   - the account has verified an email or phone number, and
 *   - the account has joined at least one official community (a community an
 *     admin has tagged with `officialProduct`, e.g. the BTCY community).
 *
 * 50 IndexxPoints mirrors the campaign doc's "50 BTCY Nuggets" option, paid in
 * the currency YaysApp actually owns.
 */
export const ACTIVATION_REWARD_POINTS = 50;

const lower = (value: unknown): string => String(value ?? "").trim().toLowerCase();

export class YaysActivationService {
  private users = new UserService();
  private accounts = new PointsAccountService();
  private members = new YaysCommunityMemberService();
  private communities = new YaysCommunityService();

  private async isVerified(userLower: string): Promise<boolean> {
    const user: any = await this.users.findOneSelect(
      { email: userLower },
      { verification: 1 }
    );
    return Boolean(
      user?.verification?.emailVerified || user?.verification?.phoneVerified
    );
  }

  private async hasJoinedOfficialCommunity(userLower: string): Promise<boolean> {
    const memberships = await this.members.communitiesOf(userLower);
    if (!memberships.length) {
      return false;
    }
    const communityIds = memberships.map((m) => m.communityId);
    const officialCount = await this.communities.findCount({
      communityId: { $in: communityIds },
      officialProduct: { $ne: null },
    });
    return officialCount > 0;
  }

  /**
   * Try to complete activation for this account. Safe to call from any of the
   * campaign's trigger points (email/phone verification landing, joining a
   * community) — it only pays once the *other* gate is also already true, and
   * the points ledger's idempotency key makes a second call from a second
   * trigger a no-op.
   *
   * Also unblocks this account's referrer, if any: a referral only "counts"
   * once the referee clears this same verified-and-activated bar.
   *
   * Returns whether the reward was newly granted on this call.
   */
  async tryComplete(userLower: string): Promise<boolean> {
    const email = lower(userLower);
    if (!email) {
      return false;
    }

    const [verified, activated] = await Promise.all([
      this.isVerified(email),
      this.hasJoinedOfficialCommunity(email),
    ]);
    if (!verified || !activated) {
      return false;
    }

    const credit = await yaysPoints.credit({
      userLower: email,
      amount: ACTIVATION_REWARD_POINTS,
      reason: "activation_reward",
      activity: "Verified activation reward",
      idempotencyKey: `activation-reward:${email}`,
      countsTowardDailyCap: false,
    });
    if (credit.duplicate) {
      return false;
    }

    await this.accounts.updatePart(
      { userLower: email },
      { $set: { activationCompletedAt: new Date() } }
    );

    // Nobody is necessarily looking at a screen when this fires — it can land
    // from a background verification callback — so a push is the only way the
    // member finds out. The client also shows the reward pop-up itself the
    // next time it opens the Earn tab, from the reward history this produces.
    await notificationDelivery
      .deliver({
        userLower: email,
        category: "rewards",
        title: "Activation reward unlocked",
        body: `You earned ${ACTIVATION_REWARD_POINTS} IndexxPoints for verifying your account and joining a BTCY community.`,
        deepLink: buildDeepLink("rewards.home", {}) ?? undefined,
        dedupeKey: `activation-reward:${email}`,
      })
      .catch((error) =>
        console.error("[yays/activation] reward notification failed", error)
      );

    // A referral only qualifies once the referee is verified and active —
    // exactly the bar this method just cleared. Failure here must not undo
    // the activation payout the referee already received.
    await yaysReferrals
      .qualify(email, "activation_complete")
      .catch((error) =>
        console.error("[yays/activation] could not qualify referral", error)
      );

    return true;
  }
}

export const yaysActivation = new YaysActivationService();
