# YaysApp — production readiness

Status of the app after this pass, what is live, what is stubbed and why, and
what is needed from you to finish each remaining piece.

## Build health

| Check | Before | After |
|---|---|---|
| Mobile `tsc --noEmit` | 23 errors | **0** |
| Mobile `eslint` | 93 errors | **0** (790 style warnings remain) |
| Mobile `jest` | 202 passing | **239 passing** |
| Backend `npm test` | *no test files found* | **188 passing** |
| Backend `tsc --noEmit` | 14 errors | 14 errors — all pre-existing, see below |

The 14 backend type errors are environmental, not code: `backend/cache/` is in
`.gitignore`, so the Redis client modules that six files import are absent from
this checkout, and `config/smartCryptoPaypalPlans.json` is missing. They exist
on the deployed host. Nothing in this pass touches those files. Either commit
`backend/cache/` (it is source, not secrets) or drop it from `.gitignore` — as
things stand, a clean clone cannot build the backend.

## What became real

### Rewards, wallet, and referrals

New backend module at `/api/v1/yays/wallet`, and the mobile Earn/Wallet/Referral
screens now read it.

- **IndexxPoints ledger** — every credit is an immutable, signed ledger entry; the
  balance is the sum of them. Callers pass an idempotency key, unique per user,
  so a retried check-in cannot pay twice. Concurrent credits are handled by
  applying an atomic `$inc` first and compensating if the ledger insert loses
  the unique-index race.
- **Daily check-in** — the UTC date is both the streak key and the idempotency
  key, so a double tap, a dropped response, and two devices checking in at once
  collapse to one credit.
- **Earn activities** — chat, post, and AI progress are counted from real
  messages, posts, and AI calls. Activities with no real counter (Shop, Mine,
  Ads) report `coming_soon` rather than showing an invented progress bar.
- **Wallet** — IndexxPoints (owned by YaysApp, real) merged with Indexx crypto
  balances (read-only, flagged `preview`, since YaysApp holds no keys). An
  account with no Indexx wallet is a normal state, not an error.
- **Referrals** — **the invite code is the Indexx `user.referralCode`**, not a
  second YaysApp-only code, and redeeming one also writes
  `user.referralCodeUsed`. Without that, a friend invited through YaysApp would
  earn IndexxPoints but never move the BTCY Mining Station progress bar.
  Attribution is `pending` until the referee qualifies, so a bare signup pays
  nothing.

### 1:1 audio and video calls

New backend module at `/api/v1/yays/calls`, WebRTC signaling on the existing
chat socket, and full call UI.

- Signaling relays SDP and ICE only — media never reaches a server. A socket may
  only signal about a call it is a party to; the peer is read from the stored
  record, not from the payload.
- The **server owns the outcome**. Ring timeouts, "who hung up", and busy checks
  are decided server-side, so two devices racing cannot disagree about what
  happened. Ring time is never billed as talk time.
- A user signed in on several devices rings on all of them; the first to answer
  settles the call and the rest stop ringing.
- An incoming call pushes as `critical`, so it cuts through quiet hours the way
  a phone call should.
- A per-minute leader-only cron sweeps abandoned rings. Without it, a worker
  restart mid-ring leaves the callee permanently marked busy with no way to
  clear it.

### Indexx ecosystem dashboards

New backend module at `/api/v1/yays/ecosystem`, read-only.

- **BTCY** — live: mining status and remaining cycle, nugget and token
  balances, mining streak, alchemy pool, referral progress, station unlock,
  ads watched today.
- **ShoperPal** — buyer spend and nugget balance are live from real orders.
- **EMMM** — only nugget eligibility is knowable here.
- **ReHuman** — editorial content, no account state to read.

The rule throughout: **a value with no source is `null` and renders as an em
dash, never as a plausible number.** These screens sit next to balances, so an
invented figure reads as fact.

### Phone OTP

- **E.164 normalisation everywhere**, client and server, via
  `libphonenumber-js`. This was the documented build risk: `normalizePhone()`
  was `.trim()`, so `0300 1234567` never matched `+923001234567` and a member
  could be told their own number was unregistered. Signup, sign-in, OTP send,
  OTP verify, and password reset all canonicalise now, and lookups match every
  legacy stored form so existing accounts still resolve.
- `verifyCode` and a new `sendCode` call the real Twilio-backed endpoints
  instead of accepting a hard-coded `123456`. The "preview build" hint only
  shows when the backend is off.
- A failed SMS send now returns 502 instead of a silent 200 — a user waiting
  for a text that will never arrive cannot tell that from a slow carrier.

### Preview-data honesty

`MockNotice` is now tied to whether a module is actually served
(`dataMode` / `useLiveData`), not to a build flag. The banner disappears when
data goes live and stays up when it does not. EMMM and ShoperPal, which are only
partly live, get a narrower statement rather than the banner clearing outright.

## Bugs found and fixed along the way

- `ProfileScreen.js` called `useEffect` after an early return — a hooks-order
  violation that skipped the effect whenever the screen was loading.
- `ProfileScreen.js` used `decodeJWT` without importing it.
- `ViewMiningDetailScreen.js` used `Share` and `userData` without either.
- `Carousel.jsx` called `getSubscriptions` from a fully commented-out module;
  the IAP adapter now fails with an actionable message instead of
  `undefined is not a function` mid-checkout.
- `LoginWithPhoneNumber` navigated to a route name that does not exist.
- `VerifyEmailScreen` sent every signup to a phone-verification step for a
  hard-coded number that was not theirs.
- Call history hit the network even with the backend disabled, showing an
  "offline" error on a screen that is simply empty.

## Verify locally

```bash
cd mobile   && npx tsc --noEmit -p . && npx eslint . && npx jest
cd ../backend && npm test
```
