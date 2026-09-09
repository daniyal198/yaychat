import { IModel } from "./base";

/**
 * IndexxPoints → BTCY Nuggets.
 *
 * The one place value crosses from a balance YaysApp owns (IndexxPoints, in the
 * points ledger) into a balance Bitcoin Yay owns (mined Nuggets, in
 * `userMiningBalance`). Because the two sides live in different collections and
 * cannot share a single write, every attempt is recorded here with the balances
 * on both sides before and after, so a conversion is always reconstructable
 * even if one half failed and was refunded.
 */

/**
 * `completed` — points debited and nuggets credited.
 * `failed` — the nugget credit did not land and the points were refunded. The
 * row is kept rather than deleted: a member who saw an error needs the history
 * to show what happened to their points.
 */
export type ConversionStatus = "completed" | "failed";

export interface PointsConversion extends IModel {
  userLower: string;
  /** IndexxPoints taken out of the ledger. Always positive. */
  pointsSpent: number;
  /** BTCY Nuggets added to the mining balance. Always positive. */
  nuggetsCredited: number;
  /**
   * Nuggets per point applied to this row. Stored rather than looked up so a
   * later rate change never rewrites what a member already converted at.
   */
  rate: number;
  status: ConversionStatus;
  /** Caller-supplied; one conversion per (user, key), ever. */
  idempotencyKey: string;
  /** The ledger entry that debited the points, for audit. */
  pointsEntryId?: string | null;
  pointsBalanceAfter: number;
  nuggetBalanceBefore: number;
  nuggetBalanceAfter: number;
  failureReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date | null;
}
