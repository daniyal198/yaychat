# BTCY × YaysApp Migration & Growth Reward System

Source: `btcy-X-yaysapp.docx` and `BTCY-X-Yaysapp-Launch-Content-strategy.docx`
(BTCY × YaysApp Collaboration & Community Growth Strategy, and the 20-day
launch campaign built on top of it).

## TL;DR

The campaign's rewards are paid entirely in **IndexxPoints** — the balance
YaysApp already owns and is the source of truth for (`data/yaysWallet.ts`) —
rather than in literal BTCY Nuggets or mining-days. The campaign's *structure*
(verified activation, per-referral reward, 25/50/100 Ambassador ladder) is
implemented as-is on top of the existing referral/points engine
(`services/yaysReferral.service.ts`, `services/yaysPoints.service.ts`).

| Campaign rule | This implementation |
| --- | --- |
| Verified migration reward: 50 BTCY Nuggets *or* 3 Days Electric Mining | **50 IndexxPoints**, once per account (`services/yaysActivation.service.ts`) |
| Verified referral reward: 2 Days Turbo Mining per referral | **250 IndexxPoints** per verified referral (unchanged from the pre-existing `REFERRAL_REWARD_POINTS`) |
| 25 verified referrals → Community Ambassador: Mining Station Ownership | Mining Station unlock target raised **5 → 25** |
| 50 verified referrals → Growth Ambassador: Mining Station + 7 Days Turbo Mining | Mining Station (already unlocked) + **500 IndexxPoints** bonus |
| 100 verified referrals → Elite Ambassador: Mining Station + 7 Days Nuclear Mining + priority access | Mining Station (already unlocked) + **1,500 IndexxPoints** bonus + `priorityAccess` flag |

## Where the numbers live

`services/yaysReferral.service.ts`:

```ts
export const REFERRAL_REWARD_POINTS = 250;
export const AMBASSADOR_TIERS = [
  { tier: "community", threshold: 25,  label: "Community Ambassador", bonusPoints: 0,    unlocksMiningStation: true,  priorityAccess: false },
  { tier: "growth",    threshold: 50,  label: "Growth Ambassador",    bonusPoints: 500,  unlocksMiningStation: true,  priorityAccess: false },
  { tier: "elite",     threshold: 100, label: "Elite Ambassador",     bonusPoints: 1500, unlocksMiningStation: true,  priorityAccess: true  },
];
export const MINING_STATION_REFERRAL_TARGET = AMBASSADOR_TIERS[0].threshold; // 25
```

`services/yaysActivation.service.ts`:

```ts
export const ACTIVATION_REWARD_POINTS = 50;
```

## What "verified" and "activated" mean here

The campaign doc's gate — "creates an account, completes verification, joins
the official community, completes activation" — maps onto signals this
codebase already tracks for real, rather than a new flag invented for the
campaign:

- **Verified** — `user.verification.emailVerified` or
  `user.verification.phoneVerified` is `true`. Set the moment a member
  actually completes email or phone OTP verification
  (`platform/user.operations.ts` → `validateOtp` / `validatePhoneOtp`).
- **Joined the official community** — the member has an active membership row
  (`yaysCommunityMember`) in a community an admin has tagged with
  `officialProduct` (`yaysCommunity.officialProduct`), e.g. the BTCY
  community. Checked in `services/communityDirectory.service.ts` → `join()`.

`YaysActivationService.tryComplete(userLower)` is safe to call from either
trigger — it only pays once *both* are true, and the points ledger's
idempotency key (`activation-reward:${userLower}`) makes a repeat call from
the other trigger a no-op. It also calls `yaysReferrals.qualify()`, which is
the referrer's own gate — a referral only "counts" once its referee clears
this same bar, matching the doc's "referral only counts when verified".

## Ambassador tier bonus

`YaysReferralService.qualify()` re-checks the referrer's verified-referral
count (`statsFor().active`) every time one of their referrals qualifies, and
walks `AMBASSADOR_TIERS` ascending. Each tier's bonus is paid at most once
(idempotency key `ambassador-tier:${tier}:${referrerLower}`); the account's
`ambassadorTier` field always reflects the highest tier reached
(`models/yaysPointsAccount.ts`).

## Client-facing surface

- `GET /yays/wallet/config` — `activation.rewardPoints`, `referral.*`,
  `ambassador.tiers` (public, no auth — a client can render the reward rules
  before sign-in).
- `GET /yays/wallet/referrals` — adds `activationCompletedAt`,
  `ambassador.currentTier`, `ambassador.nextTier` to the existing referral
  summary.
- `GET` BTCY ecosystem snapshot (`YaysEcosystemService.btcy`) — adds
  `ambassador.tier` / `ambassador.nextTierAt` next to the existing
  `referrals` / `station` fields the mining dashboard already reads.

## Deliberately out of scope

- No literal "days of mining" or BTCY Nugget grants — the reward is
  IndexxPoints throughout, per product decision.
- No new admin UI for tagging a community `officialProduct: "BTCY"` — that
  field and its admin path already exist (`yaysCommunitiesAPI.ts`).
- The 20-day calendar, graphics, and social copy from the launch-content-
  strategy doc are marketing execution, not application behavior, and aren't
  encoded here.
