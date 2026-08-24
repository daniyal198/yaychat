# Module 6 — Notifications, Analytics & Admin

Status: **implemented** (MVP-core thin slice *and* the deferred admin/warehouse
half), pending stakeholder review.
Spans `backend/` and `mobile/`. Follows the per-module output discipline in
`yaysapp_module_development_plan.md` §6.

---

## 1. Objective

The cross-cutting plumbing chat needs to be trustworthy, plus operational
visibility:

- **Thin slice (MVP-core).** A push notification service that registers tokens,
  delivers, and deep-links into the right conversation; crash reporting; a
  minimal analytics/event pipeline.
- **Deferred half (built here as well, per the request).** The admin portal API,
  the unified moderation queue, and a rich-enough analytics warehouse to answer
  operational questions without scanning raw events.

## 2. Code and systems inspected

- `backend/services/notification.service.ts`, `backend/services/push.service.ts`,
  `backend/helpers/notificationHelper.ts` — the existing Indexx notification
  stack (single `user.fcmToken`, template-driven, FCM topics for groups).
- `backend/controllers/chatAPI.ts` — the DM and group send paths, the only two
  places a chat push originates today.
- `backend/services/base.ts`, `backend/db/base.ts` — the `ServiceBase`
  repository contract every service here extends.
- `backend/helpers/middleware.ts` — `validateAuthHeader`, `validateAdminRole`.
- `backend/services/chatUserReport.service.ts`, `aiAssistantReport.service.ts` —
  the two report collections the moderation queue projects from.
- `backend/services/adminAuditLog.servcie.ts` — the existing audit-log writer.
- `mobile/src/yaychat/services/pushNotifications.ts` — the previous Firebase
  implementation, gutted to a no-op in the working tree.
- `mobile/src/yaychat/services/client.ts` — the `analytics` façade
  (`console.log`-backed) and the feature-flag map.
- `mobile/src/yaychat/state/AppProviders.tsx` — where push registration and the
  foreground-message subscription already hang.

## 3. Assumptions

- **No push credentials by default.** A fresh checkout has no Firebase project,
  so the transport resolves to a stub. Everything upstream of the last hop —
  preferences, quiet hours, mute, dedupe, deep links, the in-app inbox — runs
  identically either way.
- **No Firebase config file in the app build.** `GoogleService-Info.plist` /
  `google-services.json` are absent, so the native messaging module is not
  loadable. The client degrades rather than crashing (§4).
- **Deployment lag.** The app points at production `api.v1.indexx.ai`, which does
  not yet serve `/api/v1/yays/*`. The client probes once and falls back to local
  behaviour, exactly as M5's AI adapter does.
- **Admin identity is existing identity.** Admin routes are gated by the JWT
  `role` claim already issued by the identity service; M6 introduces no separate
  admin credential.

## 4. Decisions taken

- **A YaysApp-owned device registry, not `user.fcmToken`.** The shared Indexx
  model holds exactly one token per account. A messaging app has to reach every
  device a person is signed in on, and has to survive one device revoking
  permission without silencing the others. `PushDevice` is one row per
  `(user, install)`.
- **Handover, not duplication.** Registering a device with M6 clears that token
  from `user.fcmToken`, and the chat DM path suppresses the legacy push when M6
  already delivered. The legacy call still runs, because it owns the Indexx
  inbox row and the `notificationId` stamped on the message — only its push is
  suppressed. Net effect: exactly one notification per event.
- **Per-member fan-out for groups, not FCM topics.** A topic push fans out
  inside Firebase, so it cannot consult a member's mute list or preferences.
  Group messages are delivered per member here; the legacy topic push stays for
  Bitcoin Yay's own clients.
- **Gate order: dedupe → mute → category → quiet hours.** `critical` skips the
  category switch and quiet hours but **never** skips mute — mute is the most
  explicit instruction a user can give.
- **The inbox row is written even when the push is suppressed.** A user with
  notifications off still needs to discover they were mentioned. Dropping the
  record along with the push loses the event.
- **An event allowlist, not a free-form bag.** Every event name and every
  property is declared in `services/analytics/eventCatalog.ts`. Undeclared
  events are rejected and counted; undeclared properties are dropped. Two
  reasons: a warehouse where each release invents names is a log file, and an
  open property bag is how message text ends up in analytics.
- **Idempotent ingest.** Every event carries a client-generated `eventId` under
  a unique index, so a retried batch cannot double-count. The client can retry
  without hesitation, which is what makes offline queuing safe.
- **Crash grouping ignores line numbers and message text.** Line numbers move
  every release and messages carry interpolated ids; either would split one
  defect into thousands of groups.
- **Push is loaded lazily and defensively on the client.** `require`ing
  `@react-native-firebase/messaging` in a build with no Firebase config throws at
  module scope, which takes the whole app down at import time. Every entry point
  works when the module is absent — that is why the file had been reduced to a
  no-op, and this restores the functionality without the failure mode.
- **No "everyone" broadcast target.** The admin broadcast takes an explicit
  recipient list, capped at 500. A tool that can wake the entire user base from
  one unreviewed request is an incident waiting to happen; audience selection
  belongs to M7's campaign builder with its own approval step.

## 5. Approach

```
chat send ──► deliverChatMessage ──► NotificationDeliveryService
                                      ├─ dedupe        (unique userLower+dedupeKey)
                                      ├─ mute          (per conversation)
                                      ├─ category      (messages|communities|rewards|system)
                                      ├─ quiet hours   (local minutes + UTC offset)
                                      ├─ inbox row     (always written)
                                      └─ device fan-out ──► transport (firebase | stub)
                                                              └─ token gone ⇒ disable device

app  ──► analytics/telemetry queue ──► /api/v1/yays/telemetry/events ──► allowlist ──► events
     └─► global error handler      ──► /api/v1/yays/telemetry/crashes ──► fingerprint ──► crashes
                                                                                │
admin portal ──► /api/v1/yays/admin ──► rollups ◄───────────────────────────────┘
                                   └──► moderation queue ◄── chat reports + AI reports
```

Every gate runs **before** the transport call, so a suppressed notification
never leaves the server.

## 6. Files added / changed

### Backend (new)

| File | Purpose |
|---|---|
| `data/yaysNotifications.ts` | Device, preference, inbox, delivery contracts |
| `data/yaysTelemetry.ts` | Event, crash, rollup, moderation contracts |
| `models/pushDevice.ts` | One row per install; unique `(user, deviceId)` |
| `models/notificationPreference.ts` | Categories, sounds, preview, quiet hours, mutes |
| `models/yaysNotification.ts` | Inbox + delivery outcome; unique `(user, dedupeKey)` |
| `models/analyticsEvent.ts` | Events; unique `eventId` makes ingest idempotent |
| `models/crashReport.ts` | Crashes, grouped by fingerprint |
| `models/analyticsDailyRollup.ts` | One row per UTC day |
| `models/moderationCase.ts` | Unified queue; unique `(source, sourceRef)` |
| `services/notifications/deepLinks.ts` | Route registry + link building/validation |
| `services/notifications/transports.ts` | Firebase + stub transports, env resolution |
| `services/pushDevice.service.ts` | Registry, incl. token handover between accounts |
| `services/notificationPreference.service.ts` | Preferences + `inQuietHours` |
| `services/yaysNotification.service.ts` | Inbox repository |
| `services/notificationDelivery.service.ts` | Orchestration, gates, `deliverChatMessage` |
| `services/analytics/eventCatalog.ts` | Event allowlist + property whitelist |
| `services/analyticsEvent.service.ts` | Batch ingest, dedupe, aggregation |
| `services/crashReport.service.ts` | Ingest + fingerprinting + grouping |
| `services/analyticsRollup.service.ts` | Daily warehouse rollups |
| `services/moderationCase.service.ts` | Report projection, assign, resolve |
| `services/adminMetrics.service.ts` | Admin overview read model |
| `controllers/yaysNotificationsAPI.ts`, `routes/yaysNotifications.routes.ts` | Device/preference/inbox HTTP surface |
| `controllers/yaysTelemetryAPI.ts`, `routes/yaysTelemetry.routes.ts` | Telemetry ingest (optional auth) |
| `controllers/yaysAdminAPI.ts`, `routes/yaysAdmin.routes.ts` | Admin portal, `validateAdminRole` on the router |
| `tests/m6/notifications.test.ts`, `tests/m6/telemetry.test.ts` | 36 tests |
| `.env.m6.example` | Transport + deep-link configuration |

### Backend (changed)

- `index.ts` — registers `/api/v1/yays/notifications`, `/telemetry`, `/admin`.
- `controllers/chatAPI.ts` — DM path calls `deliverChatMessage` and suppresses
  the legacy push when M6 delivered; group path fans out per member.

### Mobile (new)

- `src/yaychat/services/telemetry.ts` — batching, persisted event queue and
  crash reporter.
- `src/yaychat/services/notifications/deepLinks.ts` — client mirror of the route
  registry, plus URL parsing and tab/screen mapping.
- `src/yaychat/navigation/navigationRef.ts` — imperative navigation with a
  pending-target replay for cold-start taps.
- `__tests__/m6Notifications.test.ts` — 34 tests.

### Mobile (native)

`linkingConfig` and the notification router are JavaScript; the OS still has to
hand the app a URL before either runs. Registering the scheme is what makes a
notification tap, a Universal Link, and `xcrun simctl openurl` all reach the
same router.

- `ios/yaysapp/Info.plist` — declares the `yaychat` URL scheme alongside the
  existing Google Sign-In scheme.
- `ios/yaysapp/AppDelegate.swift` — forwards `application(_:open:options:)` and
  `application(_:continue:restorationHandler:)` to `RCTLinkingManager`. These are
  `UIApplicationDelegate` conformances, not overrides: `RCTAppDelegate` declares
  the protocol but implements neither method, so `override`/`super` do not
  compile here.
- `android/app/src/main/AndroidManifest.xml` — `VIEW` intent filters for the
  `yaychat` scheme and for `https://yay.chat` App Links.

### Mobile (changed)

- `services/pushNotifications.ts` — real implementation: permission, token
  registration, refresh, foreground messages, notification opens, status. Lazy
  module load so a build without Firebase degrades instead of crashing.
- `services/index.ts` — `notificationService` rewritten (inbox, preferences,
  mute, device registry, test send) backend-first with local fallback;
  `telemetryTransport` added.
- `services/client.ts` — `analytics` now feeds the telemetry queue.
- `types/models.ts` — `DeepLinkRoute`, `DeepLinkTarget`, `NotificationPreferences`,
  `QuietHours`, `PushDeviceInfo`, `PushStatus`; `AppNotification.deepLink`.
- `types/navigation.ts` — `linkingConfig` aligned with the server route registry.
- `navigation/index.tsx` — navigation ref, linking, cold-start replay, automatic
  `screen_view` tracking.
- `state/AppProviders.tsx` — telemetry start + global error handler, notification
  tap routing, device unregistration and a final flush on sign-out.
- `screens/profile/ProfileScreens.tsx` — notification settings backed by the real
  preference record (categories, sounds, lock-screen preview, quiet hours,
  muted count); inbox rows open their deep link; Developer screen shows push
  status and can send a test notification.

## 7. API surface

### `/api/v1/yays/notifications` — bearer token except `/config`

| Method | Path | Notes |
|---|---|---|
| GET | `/config` | Transport status, route table, categories |
| POST / GET | `/devices` | Register or refresh an install; list devices |
| DELETE | `/devices/:deviceId` | Sign-out on one device |
| GET / POST | `/preferences` | Categories, sounds, preview, quiet hours |
| POST | `/mute` | Mute/unmute one conversation |
| GET | `/inbox` | Newest-first, with unread count |
| POST | `/inbox/read-all`, `/inbox/:id/read` | Mark read |
| POST | `/test` | Send to the caller's own devices |

### `/api/v1/yays/telemetry` — optional auth

| Method | Path | Notes |
|---|---|---|
| GET | `/catalog` | Declared events and their properties |
| POST | `/events` | Batch ingest (≤100), idempotent on `eventId` |
| POST | `/crashes` | Crash reports, deduped on `crashId` |

Auth is optional here on purpose: the events that matter most for onboarding
(`app_open`, `signup_started`) and the crashes that matter most (a crash on the
sign-in screen) happen before a session exists.

### `/api/v1/yays/admin` — `validateAdminRole` on the whole router

| Method | Path | Notes |
|---|---|---|
| GET | `/overview` | Adoption, sessions, crash-free rate, push outcomes, moderation backlog |
| GET | `/events` | Event explorer |
| POST | `/rollups/recompute` | Recompute one day after a backfill |
| GET | `/crashes`, `/crashes/:fingerprint` | Grouped crashes; occurrences |
| GET | `/moderation` | Unified queue + status counts |
| POST | `/moderation/sync` | Pull new chat/AI reports into the queue |
| POST | `/moderation/:caseId/assign`, `/resolve` | Work the queue |
| POST | `/notifications/broadcast` | Explicit recipient list, ≤500 |

Every admin **write** records an audit entry; reads are not audited (the
dashboard polls them and would drown the log).

## 8. Tests and results

**Backend**: **36 passing**,
`TS_NODE_TRANSPILE_ONLY=1 npx mocha --require ts-node/register 'tests/m6/*.test.ts'`.

- `tests/m6/notifications.test.ts` (22) — deep-link building and refusal of
  unknown routes / missing params; the https twin for every declared route;
  quiet hours across midnight, same-day windows, and UTC offsets; gate ordering
  including *mute outranks critical*; transport resolution (stub by default,
  Firebase when credentialed, forced stub for staging) and stub recording.
- `tests/m6/telemetry.test.ts` (14) — event allowlist; property whitelist drops
  an undeclared `messageBody`; non-scalars dropped; strings truncated; a
  catalogue-wide assertion that no declared property looks like free text; UTC
  day partitioning; crash fingerprint stability across line-number and message
  changes, and separation across error types and call sites.

**Mobile**: **134/134 passing across 8 suites** (100 pre-existing + 34 new),
`npx jest --runInBand`.

`__tests__/m6Notifications.test.ts` (34):

- deep links — chat push routes to its conversation; URL fallback; unknown route
  and empty payload fall back to the inbox rather than nowhere; a route with an
  empty required param is refused; a legacy id-only payload still opens the
  thread; both `yaychat://` and `https://yay.chat` parse; the more specific
  community route wins; every target maps to a tab and screen;
- cold start — a tap that arrives before the navigator mounts is held and
  replayed;
- analytics — queueing without a network wait, unique ids, non-scalar props
  dropped before the queue, one session per run, flush-and-clear, **a failed
  flush keeps the batch and then sends it exactly once**, screen views become
  crash breadcrumbs, the queue is mirrored to storage;
- crash reporting — handled errors with stacks, non-`Error` throws coerced, a
  fatal crash left on disk when the send fails and delivered on the next launch,
  handled errors not persisted, and the queue forced to disk before a fatal;
- preferences — defaults, persistence, quiet-hours patch merging, mute/unmute;
- inbox — listing, unread count, mark-all-read;
- push degradation — on a build without Firebase every entry point stays
  callable, `status()` explains why push is not arriving, and sign-out never
  fails because the registry was unreachable.

**Typecheck.** Backend `tsc --noEmit`: the 14 remaining errors are pre-existing
and in unrelated files (missing `cache/redis` modules, `notificationHelper`'s
`image` property); no M6 file produces one. Mobile `tsc --noEmit`: `src/yaychat`
is **clean**; the 23 remaining errors are pre-existing in the legacy
`src/screens` / `src/components` trees.

**Lint.** `eslint` over every touched mobile file: **0 errors** (warnings only,
all pre-existing patterns — inline styles, bitwise ops in the existing hash
helper).

**One defect found and fixed during the work**: `telemetry.start()` is async, so
a provider unmounting mid-startup could install its flush interval *after*
`stop()` had already run, leaving an orphaned timer. Guarded with a generation
counter. Storage writes were also coalesced into a 200 ms window after the
per-event write proved to be measurable pressure on the render path; the fatal
crash path forces a write first, so the trail that explains a crash is never
what gets lost.

### iOS simulator

Built and launched on *iPhone 17 Pro, iOS 26.0* (`xcodebuild` + `simctl`), and
the deep-link path was exercised end to end:

- `xcrun simctl openurl booted "yaychat://chat/dm%3Abz"` on a **terminated** app
  cold-starts it straight into that conversation (correct header, composer, and
  the Chats tab selected).
- `xcrun simctl openurl booted "yaychat://notifications"` opens the inbox on the
  Me tab, with the unread markers and the per-row chevrons that distinguish a
  notification carrying a destination from one that does not.

No redbox, and no error-level entries in the device log beyond the expected
`FirebaseCore` "default app has not been configured" warnings, which are the
documented consequence of shipping without a config file (§9).

Three defects were found by doing this rather than by testing:

1. **`yaychat://` was never registered natively.** `simctl openurl` failed with
   `kLSApplicationNotFoundErr` — iOS had no app for the scheme, so every link
   was dropped before JS could route it. Fixed by the native registration above.
2. **`linkingConfig` was passed to React Navigation in the wrong shape.** The
   route table has to live under `config.screens`; a top-level `screens` key is
   ignored without error. The app opened but stayed on whatever tab it would
   have shown anyway — indistinguishable from a link that never arrived.
3. **A deep link into a conversation arrived with no back button.** React
   Navigation builds the target stack containing only the screen the URL names,
   so `ChatList` was never placed underneath — the conversation opened with no
   way back to the list, and the Chats tab stayed stuck there for the rest of
   the session. Fixed with `initialRouteName` on each nested stack in the
   linking config. (Reported from the simulator by the user, not caught by the
   tests, which cover route *resolution* rather than the resulting stack.)
4. **The imperative router had the same missing-back-stack bug.** A tap handled
   through `navigationRef` navigated into a tab that had not mounted, making the
   target that stack's *initial* route. Fixed with `initial: false`, which tells
   React Navigation to build the stack with the navigator's own home route
   underneath and push the target on top. (Reported from the simulator by the
   user.)
5. **Seeded notifications pointed at ids that only exist in the mock dataset.**
   `chat.conversation` → `c_amara` resolved to nothing against the real chat
   backend, so the conversation screen showed "something went wrong". The seed
   now links to list routes, which resolve regardless of which side is serving;
   a real notification carries a real id from the server. Two tests now assert
   this, closing the gap that let it through. (Reported by the user.)
6. **`RCTLinkingManager` is in the `React` module**, not a `React_RCTLinking`
   one; the `React-RCTLinking` pod ships only implementation files.

Push delivery to a real device still cannot be verified without a Firebase
project and a config file in the app bundle (§9).

## 9. Known limitations

- **No push credentials are configured.** Until `FIREBASE_*` is set
  (`backend/.env.m6.example`), the transport is the stub: notifications reach
  the in-app inbox and are recorded with their delivery outcome, but no device
  is woken. This is the intended default, not a defect — but "push delivered
  and routed correctly" is satisfied by configuration, and should be re-verified
  once a project is provisioned.
- **Universal Links are not verified yet.** The Android manifest declares
  `autoVerify` for `https://yay.chat` and iOS handles `NSUserActivity`, but
  neither platform will honour an https link until the site serves
  `assetlinks.json` / `apple-app-site-association`. The `yaychat://` scheme
  works without any of that. Domain verification belongs with the deep-link
  service in M4.
- **The app has no Firebase config file.** `GoogleService-Info.plist` /
  `google-services.json` are absent, so the native messaging module cannot load
  and the client reports `permission: undetermined, registered: false` with an
  explanatory note. Adding the config files is what turns registration on; no
  code change is needed.
- **The deployed backend does not yet serve `/api/v1/yays/*`.** Until it does,
  the client's probe fails, the inbox and preferences use local state, and
  telemetry stays queued on device (capped at 200 events).
- **Duplicate group pushes are possible for one legacy case.** A device that
  registered a token with an older build *and* joined a group was subscribed to
  that group's FCM topic server-side. Clearing `user.fcmToken` on M6
  registration stops the per-user legacy push, but it does not unsubscribe the
  token from topics Firebase already holds. YaysApp builds never subscribe to
  topics, so this resolves on reinstall; it does not affect new installs.
- **Crash reports are JS-level only.** The global `ErrorUtils` handler covers the
  JS thread. Native crashes (iOS signals, Android JNI) need a native SDK and are
  out of scope for this module.
- **Stack traces are unsymbolicated.** Release bundles are minified, so
  fingerprints group correctly but frames read as bundle offsets. Source-map
  upload belongs with the release pipeline in M9.
- **The admin portal is an API, not a UI.** The endpoints, the read model, and
  the audit trail exist; no web console was built — the module plan lists the
  portal under the deferred half, and a console is a separate front-end
  deliverable.
- **Moderation cases are pulled, not pushed.** `POST /moderation/sync` projects
  new reports into the queue; report creation does not yet write a case
  directly. Sync is idempotent, so a scheduled call is sufficient, but a case
  can lag its report until then.
- **`SettingsState.notifications`** still exists in the mobile settings model but
  is no longer the source of truth — the server-owned preference record is. Left
  in place to avoid touching unrelated settings persistence (the same treatment
  `SettingsState.ai` got in M5).
- **Rollup recomputation is on-demand.** `range()` recomputes today and any
  missing day when the dashboard asks. There is no scheduled job; at scale that
  belongs in `cron_jobs/`.

## 10. Security and privacy notes

- **Analytics cannot carry message content.** The property whitelist drops
  anything undeclared, values must be scalars, strings are capped at 120
  characters, and a test asserts that no declared property in the catalogue is
  named like free text.
- **Preferences and mutes are enforced server-side**, before the transport call.
  A client cannot bypass them, and a muted conversation stays silent even for
  notifications marked `critical`.
- **Lock-screen previews are a real switch.** With `previewText` off, the push
  body is replaced before it leaves the server; the full text stays only in the
  in-app inbox.
- **Device tokens migrate with the account.** Registering a token that belongs to
  another account removes it from that account first, so signing in on a shared
  device cannot leave the previous user receiving the new user's messages.
- **Invalid tokens are disabled, not deleted**, so a delivery failure remains
  auditable.
- **Admin routes are role-gated at the router**, and every admin write is
  recorded in the existing audit log with the acting admin's email.
- **Telemetry accepts unauthenticated writes by design** (pre-session events and
  crashes). Batches are capped at 100 events and 20 crashes per request, ids are
  unique-indexed, and unknown event names are rejected — so the endpoint is a
  counted, bounded sink rather than an open write. Rate limiting at the edge is
  still worth adding before public launch (M9).
- **Pre-existing issue, not introduced here:** `backend/helpers/callHuggingFaceModel.ts`
  still contains a hard-coded API key fallback (flagged in M5 and unchanged).

## 11. Acceptance criteria

### Thin slice (MVP-core)

| Criterion (module plan M6) | Status |
|---|---|
| Push delivered and routed correctly | Delivery service with device fan-out and deep links; every chat message carries the conversation target; the client routes taps from background and cold start. Real-device delivery requires credentials (§9). |
| Crashes reported | Global JS error handler; fatal crashes persisted before the network call and delivered on the next launch; grouped by a fingerprint stable across releases. |
| Core events captured | Declared catalogue covering lifecycle, identity, chat, notifications, and errors; batching offline-safe queue; idempotent ingest. |

### Deferred half (built here as well)

| Criterion | Status |
|---|---|
| Full admin portal | API complete: overview, event explorer, crash groups, rollup recompute, moderation, broadcast — all role-gated and audited. No web console (§9). |
| Moderation dashboards | Chat and AI reports projected into one queue with status counts, assignment, and resolution. |
| Rich analytics warehouse | Daily rollups (active users, sessions, events by name, crashes, crash-free session rate, push sent/delivered) with on-demand recomputation. |
