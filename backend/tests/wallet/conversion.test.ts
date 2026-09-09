/**
 * IndexxPoints → BTCY Nuggets.
 *
 * The bridge writes to two products that cannot share one transaction, so what
 * is pinned here is the ordering and the failure behaviour: points are never
 * spent without nuggets arriving, nuggets are never minted without points
 * being spent, and a retry never does either twice. The collaborators are
 * in-memory stand-ins — the same pattern `yaysContacts.service`'s tests use —
 * so the orchestration is exercised without a database.
 */
import assert from "assert";
import {
  ConversionAmountError,
  ConversionFailedError,
  ConversionNuggetGateway,
  ConversionPointsGateway,
  CONVERSION_REFERENCE_NUGGETS,
  CONVERSION_REFERENCE_POINTS,
  MIN_CONVERSION_POINTS,
  NUGGETS_PER_POINT,
  nuggetsForPoints,
  YaysConversionService,
} from "../../services/yaysConversion.service";
import { InsufficientPointsError } from "../../services/yaysPoints.service";

/** Points ledger stand-in: a balance plus the keys it has already paid. */
const stubPoints = (balance: number) => {
  const entries: { amount: number; reason: string; key: string }[] = [];
  const state = { balance };
  const gateway: ConversionPointsGateway = {
    async summary() {
      return { balance: state.balance } as any;
    },
    async credit(input) {
      const seen = entries.find((entry) => entry.key === input.idempotencyKey);
      if (seen) {
        return { entry: seen as any, account: { balance: state.balance } as any, duplicate: true };
      }
      if (input.amount < 0 && state.balance + input.amount < 0) {
        throw new InsufficientPointsError(state.balance, Math.abs(input.amount));
      }
      state.balance += input.amount;
      const entry = {
        _id: `e${entries.length + 1}`,
        amount: input.amount,
        reason: input.reason,
        key: input.idempotencyKey,
      };
      entries.push(entry as any);
      return { entry: entry as any, account: { balance: state.balance } as any, duplicate: false };
    },
  };
  return { gateway, state, entries };
};

/** Mining-balance stand-in. `failing` makes the credit half fail. */
const stubNuggets = (balance: number, failing = false) => {
  const state = { balance };
  const gateway: ConversionNuggetGateway = {
    async balanceOf() {
      return state.balance;
    },
    async credit(_userLower, amount) {
      if (failing) {
        throw new Error("Bitcoin Yay unreachable");
      }
      const before = state.balance;
      state.balance += amount;
      return { before, after: state.balance };
    },
  };
  return { gateway, state };
};

/** Conversion-record stand-in, keyed the way the unique index is. */
const stubRecords = () => {
  const rows: any[] = [];
  return {
    rows,
    store: {
      async byKey(userLower: string, idempotencyKey: string) {
        return rows.find(
          (row) => row.userLower === userLower && row.idempotencyKey === idempotencyKey
        ) || null;
      },
      async create(row: any) {
        const saved = { ...row, _id: `c${rows.length + 1}` };
        rows.push(saved);
        return saved;
      },
      async history(userLower: string, limit: number) {
        return rows.filter((row) => row.userLower === userLower).slice(0, limit);
      },
    } as any,
  };
};

const service = (points: any, nuggets: any, records: any) =>
  new YaysConversionService(points, nuggets, records);

describe("conversion rate", () => {
  it("is the rule as stated: 1,000 IndexxPoints buy 2,000 BTCY Nuggets", () => {
    assert.strictEqual(CONVERSION_REFERENCE_POINTS, 1000);
    assert.strictEqual(CONVERSION_REFERENCE_NUGGETS, 2000);
    assert.strictEqual(nuggetsForPoints(CONVERSION_REFERENCE_POINTS), CONVERSION_REFERENCE_NUGGETS);
  });

  it("scales linearly, so the rate does not depend on the size of the conversion", () => {
    assert.strictEqual(nuggetsForPoints(100), 200);
    assert.strictEqual(nuggetsForPoints(250), 500);
    assert.strictEqual(nuggetsForPoints(4000), 8000);
    assert.strictEqual(NUGGETS_PER_POINT, 2);
  });

  it("sets a minimum a member can actually reach from a few days of earning", () => {
    assert.ok(MIN_CONVERSION_POINTS > 0);
    assert.ok(MIN_CONVERSION_POINTS <= CONVERSION_REFERENCE_POINTS);
  });
});

describe("quoting a conversion", () => {
  it("prices the pair and reports both balances", async () => {
    const points = stubPoints(4000);
    const nuggets = stubNuggets(2000);
    const quote = await service(points.gateway, nuggets.gateway, stubRecords().store).quote(
      "me@example.com",
      1000
    );

    assert.strictEqual(quote.points, 1000);
    assert.strictEqual(quote.nuggets, 2000);
    assert.strictEqual(quote.pointsBalance, 4000);
    assert.strictEqual(quote.nuggetBalance, 2000);
    assert.strictEqual(quote.eligible, true);
    assert.strictEqual(quote.reason, null);
  });

  it("refuses an amount under the minimum, and says what the minimum is", async () => {
    const quote = await service(
      stubPoints(4000).gateway,
      stubNuggets(0).gateway,
      stubRecords().store
    ).quote("me@example.com", MIN_CONVERSION_POINTS - 1);

    assert.strictEqual(quote.eligible, false);
    assert.ok(String(quote.reason).includes(String(MIN_CONVERSION_POINTS)));
  });

  it("refuses more points than the member holds", async () => {
    const quote = await service(
      stubPoints(150).gateway,
      stubNuggets(0).gateway,
      stubRecords().store
    ).quote("me@example.com", 500);

    assert.strictEqual(quote.eligible, false);
    assert.ok(String(quote.reason).includes("150"));
  });

  it("prices nothing, but still reports the rules, on the screen's first load", async () => {
    const quote = await service(
      stubPoints(4000).gateway,
      stubNuggets(2000).gateway,
      stubRecords().store
    ).quote("me@example.com", 0);

    assert.strictEqual(quote.nuggets, 0);
    assert.strictEqual(quote.eligible, false);
    assert.strictEqual(quote.minimumPoints, MIN_CONVERSION_POINTS);
    assert.strictEqual(quote.pointsBalance, 4000);
  });
});

describe("converting", () => {
  it("moves the value: points out, nuggets in, at the stated rate", async () => {
    const points = stubPoints(4000);
    const nuggets = stubNuggets(2000);
    const records = stubRecords();

    const result = await service(points.gateway, nuggets.gateway, records.store).convert({
      userLower: "me@example.com",
      points: 1000,
      idempotencyKey: "k1",
    });

    assert.strictEqual(result.status, "completed");
    assert.strictEqual(result.pointsSpent, 1000);
    assert.strictEqual(result.nuggetsCredited, 2000);
    // 4,000 points and 2,000 nuggets becomes 3,000 points and 4,000 nuggets.
    assert.strictEqual(points.state.balance, 3000);
    assert.strictEqual(nuggets.state.balance, 4000);
    assert.strictEqual(result.pointsBalance, 3000);
    assert.strictEqual(result.nuggetBalance, 4000);
  });

  it("spends the points exactly once when the same request arrives twice", async () => {
    const points = stubPoints(4000);
    const nuggets = stubNuggets(0);
    const records = stubRecords();
    const bridge = service(points.gateway, nuggets.gateway, records.store);

    const first = await bridge.convert({
      userLower: "me@example.com",
      points: 500,
      idempotencyKey: "same-key",
    });
    const second = await bridge.convert({
      userLower: "me@example.com",
      points: 500,
      idempotencyKey: "same-key",
    });

    assert.strictEqual(first.duplicate, false);
    assert.strictEqual(second.duplicate, true);
    assert.strictEqual(points.state.balance, 3500);
    assert.strictEqual(nuggets.state.balance, 1000);
    assert.strictEqual(records.rows.length, 1);
  });

  it("never credits nuggets the member could not pay for", async () => {
    const points = stubPoints(50);
    const nuggets = stubNuggets(0);

    await assert.rejects(
      () =>
        service(points.gateway, nuggets.gateway, stubRecords().store).convert({
          userLower: "me@example.com",
          points: 500,
          idempotencyKey: "k1",
        }),
      InsufficientPointsError
    );
    assert.strictEqual(nuggets.state.balance, 0);
    assert.strictEqual(points.state.balance, 50);
  });

  it("refunds the points when Bitcoin Yay cannot take the nuggets", async () => {
    const points = stubPoints(4000);
    const nuggets = stubNuggets(2000, true);
    const records = stubRecords();

    await assert.rejects(
      () =>
        service(points.gateway, nuggets.gateway, records.store).convert({
          userLower: "me@example.com",
          points: 1000,
          idempotencyKey: "k1",
        }),
      ConversionFailedError
    );

    // The member is left exactly as they started, and the attempt is on record.
    assert.strictEqual(points.state.balance, 4000);
    assert.strictEqual(nuggets.state.balance, 2000);
    assert.strictEqual(records.rows.length, 1);
    assert.strictEqual(records.rows[0].status, "failed");
    assert.strictEqual(records.rows[0].nuggetsCredited, 0);
    // Debit and refund are separate entries, so the history shows what happened.
    assert.deepStrictEqual(
      points.entries.map((entry) => entry.reason),
      ["conversion_debit", "reversal"]
    );
  });

  it("rejects an amount below the minimum before touching either balance", async () => {
    const points = stubPoints(4000);
    const nuggets = stubNuggets(0);

    await assert.rejects(
      () =>
        service(points.gateway, nuggets.gateway, stubRecords().store).convert({
          userLower: "me@example.com",
          points: 10,
          idempotencyKey: "k1",
        }),
      ConversionAmountError
    );
    assert.strictEqual(points.state.balance, 4000);
    assert.strictEqual(nuggets.state.balance, 0);
  });

  it("requires an idempotency key, rather than inventing one per request", async () => {
    // A server-generated key would make every retry a fresh conversion, which
    // is exactly the double-spend the key exists to prevent.
    await assert.rejects(
      () =>
        service(
          stubPoints(4000).gateway,
          stubNuggets(0).gateway,
          stubRecords().store
        ).convert({ userLower: "me@example.com", points: 500, idempotencyKey: "" }),
      ConversionAmountError
    );
  });

  it("ignores a fractional request rather than crediting fractional nuggets", async () => {
    const points = stubPoints(4000);
    const nuggets = stubNuggets(0);

    const result = await service(points.gateway, nuggets.gateway, stubRecords().store).convert({
      userLower: "me@example.com",
      points: 100.9,
      idempotencyKey: "k1",
    });

    assert.strictEqual(result.pointsSpent, 100);
    assert.strictEqual(result.nuggetsCredited, 200);
  });
});
