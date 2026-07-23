# Yay-chat Frontend Architecture (Milestone 1)

## Stack

- React Native 0.78 / React 19 / TypeScript 5 (kept from the existing mobile
  environment — confirmed suitable; no new frameworks introduced).
- React Navigation 7 (native-stack + bottom-tabs).
- AsyncStorage behind a `secureTokenStore` interface (real keychain lands in
  Milestone 2).
- Jest + react-test-renderer for tests.

## Folder structure (`src/yaychat/`)

```
design/      tokens.ts (colors, spacing, radius, type, shadows)
             components.tsx (reusable kit — see component inventory)
types/       models.ts (domain models) · navigation.ts (route param lists, deep links)
services/    client.ts (mock transport, errors, simulation, storage/analytics/flags)
             index.ts (feature services: auth, chat, user, community, ai, earn,
                       wallet, ecosystem, notifications, settings)
             mock/db.ts (seed data — only services may import this)
state/       AppProviders.tsx (auth session, toasts, network) · hooks.ts (useAsync, useAction)
navigation/  index.tsx (root/auth/onboarding/tabs/nested stacks)
screens/     auth/ chats/ communities/ ai/ earn/ wallet/ ecosystem/ profile/ shared/
```

Entry: `App.tsx` → `AppProviders` → `YayChatNavigation`. Legacy Bitcoin Yay
screens under `src/screens`/`src/navigation` are **not mounted** (kept only as
reference for the Milestone 3 chat audit; see open decisions).

## Data flow

1. Screen calls a feature service (`chatService.listConversations(...)`).
2. Service runs through `mockRequest` (latency, offline, injected failures) and
   resolves against `mock/db.ts`, which is mutable so the session feels live.
3. `useAsync` owns loading/refreshing/error/offline state; `AsyncView` renders
   skeleton → offline → error(retry) → empty → content uniformly.
4. Mutations go through `useAction` + toast feedback; optimistic updates are
   used in the conversation screen (send → `sending` → replace / `failed` +
   retry).

Screens never import mock data directly — swapping `mockRequest` for an HTTP
client in Milestone 2 changes nothing above the service layer. Error taxonomy
is typed (`ApiError.code`: validation | unauthorized | server | offline |
not_found | rate_limited).

## Cross-cutting interfaces (mock-backed, contract-stable)

- `secureTokenStore` — session persistence (AsyncStorage now, keychain later).
- `analytics` — `track/screen` (console in dev; provider in Milestone 2).
- `featureFlags` — static map (`wallet_preview`, `dark_mode`, `stickers`, …).
- `simulation` — preview controls (offline, latency, fail-next-request) exposed
  in Me → Preview controls so stakeholders can demo every global state.

## State management

Deliberately minimal: React context for session/toast/network + local screen
state via hooks. No Redux/MobX — the mock domain doesn't justify it, and the
service layer keeps a future move to react-query straightforward (open
decision for Milestone 3 realtime cache).

## Conventions

- All UI built from `design/components.tsx`; no raw hex values outside
  `tokens.ts`.
- Route params typed centrally; screen props via `NativeStackScreenProps`.
- Every list screen ships loading/empty/error/offline/retry states via
  `AsyncView`.
- Simulated money/rewards always sit under a `MockNotice` banner.
- Error boundaries: navigation-level fallbacks via typed error states; a
  top-level React error boundary is listed as a hardening follow-up.

## Known limitations (Milestone 1)

- Messages/typing/presence are simulated locally (no socket).
- Media pickers/attachments are mocked (no camera-roll access yet).
- Legacy code remains in-repo but unmounted; removal decision deferred until
  the Milestone 3 chat audit.
- Bundle id still carries the template value; renaming the Xcode target is
  scheduled with release setup (Milestone 2 environments work).
