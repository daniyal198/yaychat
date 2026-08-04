# YaysApp — Development Timeline & Implementation Order

> Companion to **`yaysapp_module_development_plan.md`**. Chat is first: the MVP is real-time
> messaging between real users. The two Deferred modules (Growth, and Remaining Mini Apps +
> Merchant/Ads) are excluded from this timeline as post-launch work.

## Module timeline (sequential, ~25 days)

| Module | Description | Timeline |
|--------|-------------|----------|
| **M0** App Foundation & Design System | Original-branded app shell, design system, and navigation. | **Days 1–3** (3d) |
| **M1** Identity & Unified Auth | User accounts — sign up/in, sessions, password reset, profiles. | **Days 4–6** (3d) |
| **M2** Chat / Real-Time Messaging | Real-time 1:1 and group messaging with media, voice notes, receipts, presence, and push. *(The MVP.)* | **Days 7–11** (5d) |
| **M6** Notifications & Analytics | Push notifications, crash reporting, and core event tracking. | **Days 12–13** (2d) |
| **M3** Communities & Announcements | Communities with roles/moderation and official broadcast channels. | **Days 14–16** (3d) |
| **M5** AI Assistant & Support | Ecosystem-aware AI assistant and AI-first support desk. | **Days 17–19** (3d) |
| **M4** Mini App Hub + Bitcoin Yay + Deep-Link/Attribution | Manifest-driven read-only dashboards with signed deep-link handoffs and attribution. | **Days 20–23** (4d) |
| **M9** Production Hardening & Launch | Security, testing, store review, and staged rollout. | **Days 24–25** (2d) |
| **Total** | | **~25 days** |

**Chat MVP due ~day 11.** Full set through launch is **~25 working days (~5 weeks)**.

---

## Critical path

1. **Backend build must be unblocked before day 7.** The local backend `npm install` is broken and
   the nightly workflow is mobile-only. Real-time messaging (M2) cannot land until the backend is
   buildable — fix it during M0/M1 (days 1–6) so M2 can start on time.
2. **M2 (Chat) is the long pole** — sockets, media, offline sync, and push. Spike the real-time
   transport and media upload early to protect the day-11 checkpoint.

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
| **C3** Communities + AI live | day 19 | Gather + broadcast + assistant |
| **C4** Bitcoin Yay Mini App + deep link | day 23 | Hub thesis: chat → attributed action |
| **C5** Launch-ready | day 25 | Hardened, reviewed, staged rollout |
