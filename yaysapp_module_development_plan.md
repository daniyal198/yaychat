# YaysApp — Module-Based Development Plan (v3.0)

> **Supersedes** the feature-milestone plan in `yaychat_ai_development_milestones.md` (v2.1).
> That document organised work as ten sequential *feature milestones* that front-loaded a complete
> mock frontend before any real backend. This revision reorganises the same scope into **capability
> modules**, cuts to a **functional MVP**, and reorders so that **real-time messaging between real
> users ships first**.
>
> **Naming:** the product is **YaysApp** (formerly "Yay-chat" / "YayChat"). Use "YaysApp" in all
> human-facing text. On-disk identifiers are unchanged: directory `YayChat/`, remote
> `daniyal198/yaychat`, package `yaychat-mobile` — do not rename them.
>
> **Sources of truth (unchanged):** product = `yaychat_unified_product_vision_prd.md` (PRD v2.1);
> integration/technical = `YayChat_Platform_Integration_Architecture_v2.1`. Where anything conflicts,
> those v2.1 documents win.

---

## 1. What changed and why

| | v2.1 milestone plan | v3.0 module plan (this doc) |
|---|---|---|
| Unit of work | 10 sequential feature milestones | Capability **modules** that evolve independently |
| First deliverable | Entire **mock** frontend (Milestone 1) | **Real-time chat between real users** |
| Backend | Milestone 2, after the whole mock UI | Thin slice brought forward to unblock chat |
| MVP | Broad (chat + communities + AI + Mini App + deep-link + growth) | **Narrow:** the smallest product that delivers working real-time messaging |
| Everything else | In the linear sequence | Explicitly **deferred** behind the MVP cut line |

**Rationale.** The founder vision is a daily-habit communication hub. The single riskiest,
highest-value capability is messaging that actually works between two real people on two real
devices. Building a complete mock frontend first proves *layout*, not *product*. So we invert the
order: stand up only the foundation chat needs, ship real messaging, then grow outward module by
module.

---

## 2. Global rules (carried forward, still binding)

These are hard constraints from the PRD/architecture and apply to **every** module:

- **YaysApp is a hub, not a super app.** It never contains — in any form, including "temporary" or
  "demo" builds that reach users — wallets, key storage, seed phrases, send/receive/swap, buying or
  selling assets, Power Mining / Mining Station purchase, executing mining/Alchemy/rewarded-ad
  views, crediting/debiting Nuggets/BTCY/points, placing/settling predictions, checkout, or KYC for
  financial purposes. **If a requirement seems to need one of these, it is a deep link, not a feature.**
- **No mini-program runtime.** Mini Apps render read-only dashboards from manifests; they never
  execute product code or sandbox third-party JS.
- **Original identity.** Not a renamed Bitcoin Yay, not a visual clone of WeChat/WhatsApp/Telegram.
- **Reuse chat logic only.** The `bitcoin-yay-mobile` repo may be inspected for chat-related code
  (message models, sockets, sync, media, receipts, presence, pagination) and nothing else.
- **Never present mock data as real** — especially never a real-looking balance from mock data.
- **Deep-link first, read-only API second, native execution never.** The hub holds no financial state.

---

## 3. MVP definition (the cut line)

**MVP goal:** *Two real users can install YaysApp, create accounts, and exchange messages in real
time — 1:1 and in groups — reliably, with media and voice notes, delivery/read state, and push.*

Everything required to make that true is **MVP-core**. Everything else is **Deferred** (built later,
in module order). The MVP-core modules are **M0, M1, M2**, plus the thin slice of **M6** (push +
crash/analytics) that chat needs to be trustworthy.

---

## 4. Module catalogue

Each module lists: priority, objective, scope, dependencies, and the acceptance criteria that mean
"done." Priority is one of **MVP-core**, **MVP-adjacent** (next, right after core), or **Deferred**.

### M0 — App Foundation & Design System  ·  *MVP-core (thin)*
**Objective.** A runnable, original-branded RN app shell with the design system and navigation
needed to host chat — no more.
**Scope.** App scaffold, environment/config, typed navigation (tabs: Chats, Communities, Apps, AI,
Profile — but only Chats wired for MVP), state management, service-adapter seam (mock↔real
without touching screens), original design tokens + the core component set (buttons, inputs, lists,
message bubbles, composer, sheets, toasts, skeletons, empty/error/offline states). Product-specific
components (Mini App Card, Dashboard Card, ActionButton, Cross-Promotion Slot, External Link
Warning) are **specified but stubbed** until their modules arrive.
**Dependencies.** None.
**Acceptance.** App builds and runs on iOS + Android; design system documented; navigation shell
in place; a screen can switch from mock to real service by swapping an adapter, not UI.

### M1 — Identity & Unified Auth  ·  *MVP-core (thin slice)*
**Objective.** Real accounts so real users can message each other.
**Scope (MVP slice).** Sign up, sign in, sign out, session management + revocation, password reset,
email/phone verification, profile + avatar, device registration. **Account-linking foundation** (linked
product accounts, read-only scopes) is *scaffolded* (data model + settings screen) but full unified
OAuth linking against central Indexx identity is **deferred to M7-adjacent**.
**Dependencies.** M0.
**Acceptance.** A user can register, verify, sign in/out, recover an account, and manage sessions on
real APIs; profiles persist; authorisation enforced.

### M2 — Chat / Real-Time Messaging  ·  *MVP-core · HIGHEST PRIORITY*
**Objective.** Production-ready real-time messaging — the MVP itself.
**Scope.** 1:1 and group conversations; conversation list; real-time delivery over sockets; message
history with pagination and stable ordering; send retries + idempotency; delivery & read receipts;
typing indicators; presence; replies, reactions, mentions, forwarding, deletion/recall, pinned
messages; media + file upload; voice notes; in-conversation and global search; offline queue + sync;
multi-device; block/report; push notifications that open the correct conversation. Indexx links render
as branded **Action Cards**; other links get the **External Link Warning** (rendering only — no
handoff yet).
**Existing-code audit.** Produce `docs/yaychat-current-chat-audit.md`: what in `bitcoin-yay-mobile`
is reusable vs must be rebuilt cleanly.
**Dependencies.** M0 (shell), M1 (identity), M6-thin (push).
**Acceptance.** Two real users message reliably 1:1 and in groups; messages stay consistent across
reconnects; duplicate sends prevented; offline sync works; media/voice upload securely; a push
opens the right conversation; block/report work; critical flows have automated tests.

### M2.5 — Contact Discovery & Sync  ·  *MVP-adjacent · ships right after the MVP*
**Objective.** Close the WhatsApp gap: a new user opens YaysApp and can immediately message the
people from their address book who are already here, instead of facing an empty chat list.
**Why it is its own module.** M2 makes messaging work between users who have *already found each
other*; discovery is a separate problem with its own data model (a phone-hash index), its own
privacy/consent surface, and its own store-review obligations. Bolting it onto M2 would put a
GDPR-scoped data flow inside the MVP checkpoint.
**Scope.** Phone as a verified, matchable identity (reusing the existing Twilio + `usersOtps`
`phoneVerified` flow from M1); **E.164 normalisation** on device via `libphonenumber-js` — replacing
today's `normalizePhone() = .trim()`; contacts permission with a Prominent Disclosure screen ahead of
the OS prompt; salted, truncated SHA-256 hashing so raw numbers never leave the device; a
`phone_hash` index and rate-limited match endpoint; local join so the UI shows *your* contact name;
a discoverability opt-out; a `DELETE /contacts/sync` erase path; delta re-sync plus the reverse
"X just joined YaysApp" notification; and an SMS invite deep link for unmatched contacts.
**Dependencies.** M1 (verified phone), M2 (conversations to open), M6-thin (the join notification).
**Risks.** Normalisation is where contact sync silently fails. The consent/disclosure and erase paths
are not optional polish — address-book upload processes data about people who never signed up, which
is exactly what got contact sync fined in the EU and suspended in Germany.
**Acceptance.** A user grants contacts access, sees real contacts matched with their own names for
them, opens a chat with one, invites an unmatched one; raw numbers are never transmitted; opting out
of discoverability removes the user from others' match results; the erase endpoint wipes all hashes.

### M6 — Notifications, Analytics & Admin  ·  *thin slice MVP-core, rest Deferred*
**Objective.** The cross-cutting plumbing chat needs to be trustworthy, plus operational visibility.
**Scope (MVP slice).** Push notification service (register tokens, deliver, deep-link into a chat),
crash reporting, and a minimal analytics/event pipeline. **Deferred:** full admin portal, moderation
dashboards, rich analytics warehouse.
**Dependencies.** M1.
**Acceptance (MVP slice).** Push delivered and routed correctly; crashes reported; core events
captured.

--- MVP CUT LINE — everything below ships after the chat MVP is live ---

### M3 — Communities & Announcements  ·  *MVP-adjacent*
**Objective.** The gather-and-broadcast layer: the hub's marketing surface.
**Scope.** Public/private communities, discovery, search, join requests, invite links; roles + permission
enforcement; community chat, polls, events, rules; official **verified accounts** per product with a
publishing-approval workflow; broadcast announcements with scheduling, audience/region targeting,
read analytics (one primary action link each — minted through the link service, mocked until M4);
reporting, banning, moderation queues, impersonation detection.
**Dependencies.** M1, M2.
**Acceptance.** Users discover/join/leave/participate; private rules enforced; only approved publishers
post official announcements; announcements schedulable, targetable, measurable; moderation reports
enter a workflow.

### M5 — AI Assistant & Support Desk  ·  *MVP-adjacent*
**Objective.** A daily AI utility and the first line of support, ecosystem-aware enough to route users.
**Scope.** General assistant (Q&A, writing, translation, summarisation, study/coding help) with history
and suggested prompts; explicit consent before private chat content reaches a model; financial/legal/
medical disclaimers, never personalised investment advice, never guaranteed-returns framing; AI
inside chats/communities; support desk with AI first line, ticket creation, and escalation to a human
queue carrying product/Mini-App context. Ecosystem answers end with the correct **Action Card**
(mocked link until M4).
**Dependencies.** M1, M2; ecosystem Action Cards mature with M4.
**Acceptance.** AI on real providers with consent/limits visible; outages handled; costs observable;
support tickets escalate with context.

### M4 — Mini App Hub, Bitcoin Yay Mini App & Deep-Link / Attribution  ·  *MVP-adjacent (strategic)*
**Objective.** The hub's strategic differentiator: manifest-driven read-only dashboards + signed,
tracked deep-link handoffs, proven end-to-end with Bitcoin Yay. **No wallet is built** (this replaces
the old "wallet milestone").
**Scope.** Manifest schema + registry + runtime loader (a manifest change needs no app release);
dashboard renderer for the fixed card types (amount, progress, status, count, list); region/age/link
gating; framework guarantee that no card or action can write. Bitcoin Yay read adapter (Nuggets,
token balance, mining/alchemy progress, station status, referrals, notifications, eligibility) with
caching, rate limits, circuit breakers, stale-with-timestamp degradation. Deep-link service: route
registry, signed single-use expiring handoff tokens, destination allowlist, Universal/App Links + web
routes + store fallback + deferred install resolution, handoff token exchange (arrive signed-in),
outcome recording, per-route/per-campaign kill switch. Attribution: authenticated inbound completion
events, schema validation, idempotency, matching to handoff/Mini-App/campaign/surface/referrer,
fraud signals.
**Unified account linking (full).** The complete OAuth-style linking deferred from M1 lands here.
**Dependencies.** M0, M1, M6.
**Acceptance.** A Mini App renders entirely from its manifest (adding one needs no app change); the
Bitcoin Yay dashboard matches the product's own values with source + freshness; no service can write
a balance/asset/reward (verified by review + test); a confirmed action is traceable to its handoff;
duplicate events don't double-count; deep-link routes tested incl. not-installed, web, and expired
paths.

### M7 — Growth: Referrals, Campaigns, Cross-Promotion, Academy  ·  *Deferred*
**Objective.** An operational marketing system without an engineering ticket per campaign.
**Scope.** Campaign model + admin builder (target, schedule, preview, approve, instant disable);
campaign cards across surfaces; cross-promotion service + per-Mini-App slot; multi-product quests
driven by verified events; daily check-in/streaks; referral centre (per-product code, tracked sharing,
deferred referral links, leaderboards); Index Academy (courses, lessons, quizzes, lesson-ending
Action Cards); frequency capping; A/B variants; anti-abuse. Rewards are **defined, funded, and
credited by the owning product — never by YaysApp**.
**Dependencies.** M3, M4.
**Acceptance.** A marketer creates→targets→schedules→publishes→disables a campaign with no
code change; cross-promo records conversions; quest progress updates only from verified events;
referral links survive install and attribute correctly.

### M8 — Remaining Mini Apps, Merchant & Advertising  ·  *Deferred*
**Objective.** Extend the proven Mini App pattern to the rest of the ecosystem; add business revenue.
**Scope.** ShopperPal, ReHuman, EMMM (region/age-gated), AI AI And AI, Crypto Treasury
(region-gated) Mini Apps — each added by manifest + summary endpoint, no core change. Merchant
accounts/verification/promoted posts; sponsored communities/channels/posts with clear labelling;
merchant analytics/billing/fraud prevention. **Rewarded/banner ad inventory stays inside the product
apps — YaysApp promotes and links, never serves ads.**
**Dependencies.** M4, M7.
**Acceptance.** Each new Mini App added by manifest with no core change; restricted Mini Apps
invisible outside approved regions; merchants verifiable; ads labelled and auditable.

### M9 — Production Hardening & Launch  ·  *Deferred (pre-public-release gate)*
**Objective.** Prepare YaysApp for secure public release.
**Scope.** Security/privacy/compliance review, threat modelling, pen testing (incl. **deep-link pen
tests** — forged links, replayed tokens, tampered payloads, open-redirect — and manifest validation),
load/stress testing, accessibility, localisation readiness, crash/metrics/alerts, incident response,
backup/restore + DR tests, store assets + per-market policy review (a chat app promoting token/mining
activity gets extra scrutiny), financial-promotion copy review, release signing, staged rollout, rollback.
**Dependencies.** All shipping modules.
**Acceptance.** No critical security issues; every deep-link route passes its regression suite per
platform; malformed/unregistered manifests rejected; performance targets met; rollback path exists
and release approval recorded.

---

## 5. Deferred / removed from MVP (explicit)

To keep the MVP functional and small, the following are **postponed** (order preserved above), not
built for first release:

- Communities & Announcements (M3), AI & Support (M5) — valuable, but not required to prove
  real-time messaging. Bring up immediately **after** the chat MVP.
- Mini App Hub, Bitcoin Yay Mini App, Deep-Link & Attribution, full unified linking (M4) — the
  strategic core of the *hub*, but heavy; sequence it right after the communication layer is solid.
- Growth/referrals/campaigns/academy (M7), remaining Mini Apps + merchant/ads (M8).
- Voice/video calls, and any third-party mini-program runtime — **out of scope by design**, not a gap.

---

## 6. Per-module output discipline (unchanged from v2.1 §16)

For each module: start with objective, code/systems inspected, assumptions, open decisions,
approach, task breakdown, files to change, risks, acceptance criteria. During work, keep scope to the
active module, keep the app runnable, add tests alongside critical behaviour, update docs, and **flag
immediately** if a requirement appears to need a wallet, balance write, ad serving, or runtime — that
is a scope error, not a task. End with completed/remaining items, files changed, tests + results,
known limitations, open decisions, security concerns, and confirmation that acceptance criteria were
met. **Do not start the next module until the current one meets its acceptance criteria.**

## 7. Critical-path note for the autonomous workflow

The chat MVP requires **real backend work** (sockets, delivery, media, push). The local backend
`npm install` is currently broken, and the nightly autonomous workflow is scoped to `mobile/` only.
**Unblocking the backend build is the true critical-path task for the MVP** — until then, the nightly
bot can progress M0 (design system, shell, chat UI on mock adapters) and the chat audit, but cannot
land real-time messaging. See the companion **`yaysapp_module_timeline.md`** for sequencing.
