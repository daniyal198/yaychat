import { ServiceBase } from "./base";
import pointsConversionSchema, {
  PointsConversionModel,
} from "../models/yaysPointsConversion";
import { PointsConversion } from "../data/yaysConversion";
import {
  CreditInput,
  CreditResult,
  InsufficientPointsError,
  yaysPoints,
} from "./yaysPoints.service";
import { UserMiningBalanceService } from "./userMiningBalance.service";
import { PointsAccount } from "../data/yaysWallet";

/**
 * The IndexxPoints → BTCY Nuggets bridge.
 *
 * ## The rate
 *
 * 1,000 IndexxPoints buy 2,000 Nuggets, so one point is worth two nuggets. The
 * reference pair is kept alongside the derived rate because that is how the
 * rule is stated to members ("1,000 points = 2,000 nuggets") and how it is
 * quoted back on the Convert screen.
 *
 * ## Why it is not one transaction
 *
 * The two balances live in different products: points in this module's ledger,
 * nuggets in Bitcoin Yay's `userMiningBalance`. They are not written under one
 * Mongo transaction, so the order is deliberate — **debit first, credit
 * second**. If the credit fails, the points are refunded and the attempt is
 * recorded as `failed`. The reverse order could credit nuggets that were never
 * paid for, which is the failure that mints money; this order can only ever
 * fail towards the member being made whole.
 *
 * ## Where the nuggets land
 *
 * `userMiningBalance.transferableBalance` for coinSymbol BTCY — the spendable
 * half of what the BTCY dashboard reports as "BTCY Nugget", and the balance
 * Bitcoin Yay's own withdraw flow draws on, so converted nuggets are worth
 * exactly what mined ones are. `Mining.totalMined` is deliberately left alone:
 * it is a record of mining *production*, and converted nuggets were not mined.
 */

const BTCY = "BTCY";
const BTCY_COIN_NAME = "Bitcoin Yay";
const BTCY_NETWORK = "Stellar";

/** The rule as it is stated to members. */
export const CONVERSION_REFERENCE_POINTS = 1000;
export const CONVERSION_REFERENCE_NUGGETS = 2000;

/** Nuggets received per IndexxPoint spent. */
export const NUGGETS_PER_POINT = CONVERSION_REFERENCE_NUGGETS / CONVERSION_REFERENCE_POINTS;

/**
 * Smallest conversion. Below this the write cost and the row in a member's
 * history outweigh what they get, and it keeps the ledger from filling with
 * one-point conversions.
 */
export const MIN_CONVERSION_POINTS = 100;

/** Nuggets carry five decimals everywhere in the mining code; match it. */
const roundNuggets = (value: number): number =>
  Math.round(Number(value || 0) * 100000) / 100000;

export const nuggetsForPoints = (points: number): number =>
  roundNuggets(points * NUGGETS_PER_POINT);

export class ConversionAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversionAmountError";
  }
}

/**
 * The nugget credit failed and the points were put back. Distinct from an
 * amount error: nothing the member did was wrong, and their balance is intact.
 */
export class ConversionFailedError extends Error {
  constructor(public refunded: number) {
    super(
      "Bitcoin Yay could not take the Nuggets right now. Your IndexxPoints were not spent."
    );
    this.name = "ConversionFailedError";
  }
}

/** What a member sees before committing: what they pay, and what they get. */
export interface ConversionQuote {
  points: number;
  nuggets: number;
  rate: number;
  minimumPoints: number;
  referencePoints: number;
  referenceNuggets: number;
  /** Points balance the quote was checked against, when known. */
  pointsBalance?: number;
  /** Nuggets already held, so the screen can show the resulting total. */
  nuggetBalance?: number;
  eligible: boolean;
  /** Why not, when `eligible` is false. Null when the quote is good. */
  reason: string | null;
}

export interface ConversionResult {
  id: string;
  status: PointsConversion["status"];
  pointsSpent: number;
  nuggetsCredited: number;
  rate: number;
  pointsBalance: number;
  nuggetBalance: number;
  createdAt: string;
  /** True when this key had already been converted and nothing new was written. */
  duplicate: boolean;
}

/**
 * The two collaborators the bridge writes through, narrowed to what it uses so
 * the orchestration — debit, credit, refund-on-failure — can be tested without
 * a database.
 */
export interface ConversionPointsGateway {
  summary(userLower: string): Promise<PointsAccount>;
  credit(input: CreditInput): Promise<CreditResult>;
}

export interface ConversionNuggetGateway {
  balanceOf(userLower: string): Promise<number>;
  credit(userLower: string, amount: number): Promise<{ before: number; after: number }>;
}

/** BTCY mined-nugget balance, the figure the BTCY dashboard shows. */
export class MiningNuggetGateway implements ConversionNuggetGateway {
  private balances = new UserMiningBalanceService();

  /**
   * The member's whole nugget position: transferable plus unverified.
   *
   * Deliberately the same sum the BTCY dashboard's "BTCY Nugget" tile reports.
   * Reading only `transferableBalance` here would leave the wallet quoting a
   * smaller number than Bitcoin Yay does for the same account, which reads as
   * one of the two screens being wrong.
   */
  async balanceOf(userLower: string): Promise<number> {
    const row: any = await this.balances.findOne({ email: userLower, coinSymbol: BTCY });
    return roundNuggets(
      Number(row?.transferableBalance || 0) + Number(row?.unverifiedBalance || 0)
    );
  }

  /**
   * Credits `transferableBalance` — the spendable half, and the half Bitcoin
   * Yay's own withdraw flow draws on. Converted nuggets are paid for, so they
   * are not held back as unverified.
   */
  async credit(
    userLower: string,
    amount: number
  ): Promise<{ before: number; after: number }> {
    const before = await this.balanceOf(userLower);
    // Upserted rather than read-then-write: members who have never mined have
    // no balance row yet, and `$inc` keeps a concurrent mining credit from
    // being lost. The query fields are set by the upsert itself, so only the
    // remaining defaults belong in `$setOnInsert`.
    const updated: any = await this.balances.findOneUpdate(
      { email: userLower, coinSymbol: BTCY },
      {
        $inc: { transferableBalance: amount },
        $setOnInsert: {
          adRevenueTransferableBalance: 0,
          migratedBalance: 0,
          unverifiedBalance: 0,
          coinName: BTCY_COIN_NAME,
          coinNetwork: BTCY_NETWORK,
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    const after =
      updated?.transferableBalance == null
        ? before + amount
        : Number(updated.transferableBalance) + Number(updated.unverifiedBalance || 0);
    return { before, after: roundNuggets(after) };
  }
}

class ConversionRecordService extends ServiceBase<PointsConversion, PointsConversionModel> {
  constructor() {
    super(pointsConversionSchema, "YaysPointsConversion");
  }

  async byKey(userLower: string, idempotencyKey: string): Promise<PointsConversion | null> {
    return (await this.findOne({ userLower, idempotencyKey })) || null;
  }

  async history(userLower: string, limit: number, skip: number): Promise<PointsConversion[]> {
    return this.findPaginatedSkip(limit, skip, { createdAt: -1 }, { userLower }, {});
  }
}

export class YaysConversionService {
  constructor(
    private points: ConversionPointsGateway = yaysPoints,
    private nuggets: ConversionNuggetGateway = new MiningNuggetGateway(),
    private records = new ConversionRecordService()
  ) {}

  /**
   * Price a conversion.
   *
   * `points` of 0 (or omitted) prices nothing but still reports the rules and
   * both balances, which is what the Convert screen loads with.
   */
  async quote(userLower: string, points: number): Promise<ConversionQuote> {
    const [account, nuggetBalance] = await Promise.all([
      this.points.summary(userLower),
      this.nuggets.balanceOf(userLower),
    ]);
    return {
      ...this.priceOnly(points, account.balance),
      pointsBalance: account.balance,
      nuggetBalance,
    };
  }

  /** The arithmetic and the rules, with no reads. */
  priceOnly(points: number, balance?: number): ConversionQuote {
    const requested = Math.floor(Number(points) || 0);
    const base = {
      points: Math.max(0, requested),
      nuggets: requested > 0 ? nuggetsForPoints(requested) : 0,
      rate: NUGGETS_PER_POINT,
      minimumPoints: MIN_CONVERSION_POINTS,
      referencePoints: CONVERSION_REFERENCE_POINTS,
      referenceNuggets: CONVERSION_REFERENCE_NUGGETS,
    };
    if (requested <= 0) {
      return { ...base, eligible: false, reason: "Enter how many IndexxPoints to convert." };
    }
    if (requested < MIN_CONVERSION_POINTS) {
      return {
        ...base,
        eligible: false,
        reason: `The smallest conversion is ${MIN_CONVERSION_POINTS} IndexxPoints.`,
      };
    }
    if (balance != null && requested > balance) {
      return {
        ...base,
        eligible: false,
        reason: `You have ${balance.toLocaleString("en-US")} IndexxPoints.`,
      };
    }
    return { ...base, eligible: true, reason: null };
  }

  /**
   * Spend points, receive nuggets.
   *
   * Idempotent on `idempotencyKey`: the same key always resolves to the same
   * conversion, whether it arrives twice from a double tap or from a retry
   * after a dropped response.
   */
  async convert(input: {
    userLower: string;
    points: number;
    idempotencyKey: string;
  }): Promise<ConversionResult> {
    const userLower = String(input.userLower || "").trim().toLowerCase();
    const idempotencyKey = String(input.idempotencyKey || "").trim();
    const points = Math.floor(Number(input.points) || 0);

    if (!userLower) {
      throw new ConversionAmountError("Sign in to convert IndexxPoints.");
    }
    if (!idempotencyKey) {
      throw new ConversionAmountError("An idempotency key is required.");
    }
    const priced = this.priceOnly(points);
    if (!priced.eligible) {
      throw new ConversionAmountError(priced.reason as string);
    }

    const already = await this.records.byKey(userLower, idempotencyKey);
    if (already) {
      return this.toResult(already, true);
    }

    const nuggets = nuggetsForPoints(points);

    // 1. Debit. Throws InsufficientPointsError when the balance cannot cover
    //    it, so the nugget side is never reached for points that do not exist.
    //    Conversions bypass the daily *earning* cap — that cap governs how much
    //    a member can earn in a day, not how much of what they already hold
    //    they may spend.
    const debit = await this.points.credit({
      userLower,
      amount: -points,
      reason: "conversion_debit",
      activity: "Converted to BTCY Nuggets",
      idempotencyKey: `convert:${idempotencyKey}`,
      countsTowardDailyCap: false,
      note: `${points.toLocaleString("en-US")} IndexxPoints → ${nuggets.toLocaleString(
        "en-US"
      )} BTCY Nuggets`,
      meta: { nuggets, rate: NUGGETS_PER_POINT, conversionKey: idempotencyKey },
    });

    // 2. Credit. Anything that goes wrong from here leaves the member short of
    //    points, so it is refunded before the error is reported.
    let credited: { before: number; after: number };
    try {
      credited = await this.nuggets.credit(userLower, nuggets);
    } catch (error: any) {
      const refund = await this.refund(userLower, points, idempotencyKey, error);
      await this.record({
        userLower,
        points,
        nuggets,
        status: "failed",
        idempotencyKey,
        pointsEntryId: String((debit.entry as any)?._id || ""),
        pointsBalanceAfter: refund,
        nuggetBefore: 0,
        nuggetAfter: 0,
        failureReason: String(error?.message || "Nugget credit failed."),
      });
      throw new ConversionFailedError(points);
    }

    const row = await this.record({
      userLower,
      points,
      nuggets,
      status: "completed",
      idempotencyKey,
      pointsEntryId: String((debit.entry as any)?._id || ""),
      pointsBalanceAfter: debit.account.balance,
      nuggetBefore: credited.before,
      nuggetAfter: credited.after,
      failureReason: null,
    });

    return this.toResult(row, false);
  }

  async history(userLower: string, limit: number, skip = 0): Promise<ConversionResult[]> {
    const rows = await this.records.history(userLower, limit, skip);
    return rows.map((row) => this.toResult(row, false));
  }

  /**
   * Put the points back after a failed credit.
   *
   * A distinct idempotency key from the debit, so the refund is its own ledger
   * entry and the pair reads as what happened rather than as a vanished debit.
   * If even the refund fails there is nothing further this process can do — it
   * is logged loudly, because that is a member owed points.
   */
  private async refund(
    userLower: string,
    points: number,
    idempotencyKey: string,
    cause: any
  ): Promise<number> {
    try {
      const result = await this.points.credit({
        userLower,
        amount: points,
        reason: "reversal",
        activity: "Conversion refund",
        idempotencyKey: `convert-refund:${idempotencyKey}`,
        countsTowardDailyCap: false,
        note: "BTCY Nuggets could not be credited.",
        meta: { conversionKey: idempotencyKey, cause: String(cause?.message || cause) },
      });
      return result.account.balance;
    } catch (refundError) {
      console.error(
        `[yays/convert] REFUND FAILED for ${userLower} key=${idempotencyKey} points=${points}`,
        refundError
      );
      return 0;
    }
  }

  private async record(input: {
    userLower: string;
    points: number;
    nuggets: number;
    status: PointsConversion["status"];
    idempotencyKey: string;
    pointsEntryId: string;
    pointsBalanceAfter: number;
    nuggetBefore: number;
    nuggetAfter: number;
    failureReason: string | null;
  }): Promise<PointsConversion> {
    const now = new Date();
    try {
      return await this.records.create({
        userLower: input.userLower,
        pointsSpent: input.points,
        nuggetsCredited: input.status === "completed" ? input.nuggets : 0,
        rate: NUGGETS_PER_POINT,
        status: input.status,
        idempotencyKey: input.idempotencyKey,
        pointsEntryId: input.pointsEntryId || null,
        pointsBalanceAfter: input.pointsBalanceAfter,
        nuggetBalanceBefore: input.nuggetBefore,
        nuggetBalanceAfter: input.nuggetAfter,
        failureReason: input.failureReason,
        completedAt: input.status === "completed" ? now : null,
        createdAt: now,
      } as PointsConversion);
    } catch (error) {
      // The value has already moved; losing the audit row must not fail the
      // call back to a member whose nuggets are already there.
      console.error(`[yays/convert] could not record conversion for ${input.userLower}`, error);
      return {
        userLower: input.userLower,
        pointsSpent: input.points,
        nuggetsCredited: input.status === "completed" ? input.nuggets : 0,
        rate: NUGGETS_PER_POINT,
        status: input.status,
        idempotencyKey: input.idempotencyKey,
        pointsBalanceAfter: input.pointsBalanceAfter,
        nuggetBalanceBefore: input.nuggetBefore,
        nuggetBalanceAfter: input.nuggetAfter,
        createdAt: now,
      } as PointsConversion;
    }
  }

  private toResult(row: any, duplicate: boolean): ConversionResult {
    return {
      id: String(row?._id || row?.idempotencyKey || ""),
      status: row.status,
      pointsSpent: Number(row.pointsSpent) || 0,
      nuggetsCredited: Number(row.nuggetsCredited) || 0,
      rate: Number(row.rate) || NUGGETS_PER_POINT,
      pointsBalance: Number(row.pointsBalanceAfter) || 0,
      nuggetBalance: Number(row.nuggetBalanceAfter) || 0,
      createdAt: (row.createdAt instanceof Date ? row.createdAt : new Date()).toISOString(),
      duplicate,
    };
  }
}

export { InsufficientPointsError };

export const yaysConversion = new YaysConversionService();
