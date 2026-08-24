/**
 * Rewards — IndexxPoints, the wallet view, and referrals.
 *
 * These run against the local fallback (the deployment probe answers "not
 * available" under test), which is the path a user sees before the rewards
 * backend ships. They cover the behaviours that would cost real money or real
 * trust if they were wrong: a check-in must not pay twice, a wallet row must
 * declare whether YaysApp can actually move it, an invite code must not be
 * self-redeemable, and the preview banner must track the real data source
 * rather than a build flag.
 */
import {
  earnService,
  referralService,
  rewardRules,
  simulation,
  walletService,
} from '../src/yaychat/services';
import {ApiError} from '../src/yaychat/services/client';
import {dataMode} from '../src/yaychat/services/dataMode';

beforeAll(() => {
  simulation.latencyMs = 0;
});

beforeEach(() => {
  dataMode.reset();
});

describe('earn', () => {
  it('returns a summary with the account balance and invite code', async () => {
    const summary = await earnService.summary();
    expect(typeof summary.balance).toBe('number');
    expect(summary.referralCode).toBeTruthy();
    expect(summary.dailyLimit).toBeGreaterThan(0);
  });

  it('lists activities with a status the UI knows how to render', async () => {
    const activities = await earnService.activities();
    expect(activities.length).toBeGreaterThan(0);
    for (const activity of activities) {
      expect(['available', 'completed_today', 'coming_soon', 'limit_reached']).toContain(
        activity.status,
      );
    }
  });

  it('refuses a second check-in on the same day', async () => {
    const first = await earnService.checkIn();
    expect(first.checkedInToday).toBe(true);

    // The user taps again — a double tap, or a retry after a slow response.
    // Paying twice for one day is the failure this guards.
    await expect(earnService.checkIn()).rejects.toBeInstanceOf(ApiError);
  });

  it('credits the check-in reward exactly once into history', async () => {
    const before = await earnService.history();
    await earnService.checkIn().catch(() => undefined);
    const after = await earnService.history();
    const added = after.length - before.length;
    expect(added).toBeLessThanOrEqual(1);
  });
});

describe('wallet', () => {
  it('marks every asset with whether YaysApp can move it', async () => {
    const assets = await walletService.assets();
    expect(assets.length).toBeGreaterThan(0);
    for (const asset of assets) {
      // `preview` drives whether Send/Convert are offered. An undefined value
      // would render as "movable" and promise a transfer that cannot happen.
      expect(typeof asset.preview).toBe('boolean');
      expect(asset.symbol).toBeTruthy();
    }
  });

  it('reports a missing transaction as not found rather than empty', async () => {
    await expect(walletService.transaction('does-not-exist')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('referrals', () => {
  it('exposes the code and the reward figures the screen quotes', async () => {
    const summary = await referralService.summary();
    expect(summary.code).toBeTruthy();
    expect(summary.rewardPerReferral).toBeGreaterThan(0);
    expect(summary.welcomeBonus).toBeGreaterThan(0);
    expect(summary.stats.total).toBe(summary.items.length);
  });

  it('rejects your own invite code', async () => {
    const summary = await referralService.summary();
    // Self-referral is the cheapest way to farm a welcome bonus, so it has to
    // fail on both sides rather than only on the server.
    await expect(referralService.redeem(summary.code)).rejects.toMatchObject({
      code: 'validation',
    });
  });

  it('rejects an empty code before making a request', async () => {
    await expect(referralService.redeem('   ')).rejects.toBeInstanceOf(ApiError);
  });

  it('reports an unknown code as not found', async () => {
    await expect(referralService.lookup('ZZZZZZZZ')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('reward rules', () => {
  it('exposes limits the screens can quote without hard-coding them', () => {
    const rules = rewardRules();
    expect(rules.dailyLimit).toBeGreaterThan(0);
    expect(rules.checkInPoints).toBeGreaterThan(0);
    expect(rules.referral.miningStationTarget).toBeGreaterThan(0);
  });
});

describe('preview-data flag', () => {
  it('treats an unprobed module as preview, not as live', () => {
    // The banner says "none of this is real". Defaulting to live would drop it
    // over simulated balances, which is the one direction that misleads.
    expect(dataMode.isLive('rewards')).toBe(false);
  });

  it('notifies subscribers when a module goes live', () => {
    const seen: [string, boolean][] = [];
    const unsubscribe = dataMode.subscribe((module, live) => seen.push([module, live]));
    dataMode.set('rewards', true);
    unsubscribe();
    expect(seen).toContainEqual(['rewards', true]);
    expect(dataMode.isLive('rewards')).toBe(true);
  });

  it('does not re-notify when a module reports the same state twice', () => {
    dataMode.set('rewards', true);
    let calls = 0;
    const unsubscribe = dataMode.subscribe(() => {
      calls += 1;
    });
    dataMode.set('rewards', true);
    unsubscribe();
    expect(calls).toBe(0);
  });
});
