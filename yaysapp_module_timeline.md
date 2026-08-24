# YaysApp — Development Timeline & Implementation Order

> Companion to **`yaysapp_module_development_plan.md`**. Chat is first: the MVP is real-time
> messaging between real users. The two Deferred modules (Growth, and Remaining Mini Apps +
> Merchant/Ads) are excluded from this timeline as post-launch work.

## Module timeline (sequential, ~26 days)

| Module | Description | Timeline |
|--------|-------------|----------|
| **M0** App Foundation & Design System | Original-branded app shell, design system, and navigation. | **Days 1–3** (3d) |
| **M1** Identity & Unified Auth | User accounts — sign up/in, sessions, password reset, profiles. | **Days 4–6** (3d) |
| **M2** Chat / Real-Time Messaging | Real-time 1:1 and group messaging with media, voice notes, receipts, presence, and push. *(The MVP.)* | **Days 7–11** (5d) |
| **M2.5** Contact Discovery & Sync | Address-book matching on verified phone numbers, so a user can message any contact already on YaysApp. | **Day 12** (1d) |
| **M6** Notifications & Analytics | Push notifications, crash reporting, and core event tracking. | **Days 13–14** (2d) |
| **M3** Communities & Announcements | Communities with roles/moderation and official broadcast channels. | **Days 15–17** (3d) |
| **M5** AI Assistant & Support | Ecosystem-aware AI assistant and AI-first support desk. | **Days 18–20** (3d) |
| **M4** Mini App Hub + Bitcoin Yay + Deep-Link/Attribution | Manifest-driven read-only dashboards with signed deep-link handoffs and attribution. | **Days 21–24** (4d) |
| **M9** Production Hardening & Launch | Security, testing, store review, and staged rollout. | **Days 25–26** (2d) |
| **Total** | | **~26 days** |

**Chat MVP due ~day 11 — unchanged.** M2.5 is inserted *after* the MVP checkpoint so it adds a day
to launch without moving the chat commitment. Full set through launch is **~26 working days (~5.5
weeks)**.

---

## Critical path

1. **Backend build must be unblocked before day 7.** The local backend `npm install` is broken and
   the nightly workflow is mobile-only. Real-time messaging (M2) cannot land until the backend is
   buildable — fix it during M0/M1 (days 1–6) so M2 can start on time.
2. **M2 (Chat) is the long pole** — sockets, media, offline sync, and push. Spike the real-time
   transport and media upload early to protect the day-11 checkpoint.
3. **M2.5 depends on M1 shipping *verified* phone numbers.** Twilio SMS, the `usersOtps` model
   (`phoneVerified`/`phoneVerifiedOn`) and phone sign-in already exist, which is what keeps this to a
   day — but an unverified number is not a usable identity, so M1 must land phone OTP, not just
   phone-as-a-field. The one genuine build risk is **E.164 normalisation**: `normalizePhone()` is
   currently `.trim()`, so `0300 1234567` never matches `+923001234567`. Normalisation is where
   contact sync usually fails silently.

## What the nightly autonomous workflow can do now vs. later

- **Now (mobile-only, backend blocked):** M0 (design system, app shell, navigation), the chat UI on
  mock adapters, the `bitcoin-yay-mobile` chat audit, and mobile-side tests.
- **After the backend build is fixed:** real M1 auth and M2 real-time messaging — the MVP itself.

## Checkpoints / demos

| Checkpoint | Due | Proves |
|------------|-----|--------|
| **C0** Shell + design system runs | day 3 | Original-branded app, navigation, no mock-as-real |
| **C1** Real login between two devices | day 6 | Real accounts + sessions |
| **C2 — MVP** Real-time chat, 2 real users | **day 11** | 1:1 + group, media, voice, receipts, push |
| **C2.5** Contact sync finds a real contact | day 12 | Address book → "message anyone already on YaysApp" |
| **C3** Communities + AI live | day 20 | Gather + broadcast + assistant |
| **C4** Bitcoin Yay Mini App + deep link | day 24 | Hub thesis: chat → attributed action |
| **C5** Launch-ready | day 26 | Hardened, reviewed, staged rollout |
