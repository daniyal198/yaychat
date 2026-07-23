# Yay-chat Frontend Test Plan (Milestone 1)

## Tooling

Jest 29 (`react-native` preset) + react-test-renderer. Setup in
`jest.setup.js` mocks AsyncStorage and Ionicons. Run: `npm test` (or
`npx jest`) from `mobile/`.

## Automated coverage (implemented)

### `__tests__/services.test.ts` — critical flow logic
- Auth: email/password validation, simulated bad credentials, sign-in returns
  onboarded session, sign-up returns non-onboarded session, verification code,
  username rules & availability.
- Chat: list filtering + pinned-first sort, archived filter, send appends +
  status, empty/`#fail` failures, reaction toggle on/off, direct-conversation
  reuse, group creation with owner role, pagination, cross-conversation search.
- Communities: category/query discovery, public join, private join-request,
  invite-only rejection, create-as-admin, single poll vote.
- AI: start/send simulated reply, credit consumption, provider-unavailable
  error.
- Earn: single daily check-in (+20, streak, duplicate rejected), ledger entry.
- Wallet: every asset/transaction flagged preview.
- Transport: offline error propagation, fail-next-request affects exactly one
  call.

### `__tests__/components.test.tsx` — design-kit interactions
Button press + loading lockout + accessibility label; TextField error/hint;
SearchBar clear affordance; Empty/Error/Offline states incl. retry callback;
AsyncView all five branches (skeleton/offline/error/empty/content); ListRow
content + avatar initials; Badge tones.

### `__tests__/App.test.tsx` — smoke
App renders within providers.

## Manual review checklist (stakeholder pass)

1. Full sign-up → onboarding → tabs; relaunch restores session.
2. Conversation flows incl. `#fail` retry and attachment sends.
3. Community join/request/invite-only trio.
4. AI tool grid, `#unavailable` retry, saved history.
5. Earn check-in idempotence and reversed-reward warning.
6. Wallet preview labeling on every screen.
7. Me → Preview controls: offline, fail-next, slow latency, session expiry.
8. VoiceOver spot-check on buttons/rows (labels provided by the kit).

## Known gaps / next milestones

- No E2E harness yet (Detox/Maestro decision deferred to Milestone 2 when real
  APIs exist; current flows are mock-deterministic).
- Screen-level render tests are limited to the kit + services by design —
  navigation-mounted screen tests arrive with the API integration tests.
- Visual regression testing is a Milestone 10 (hardening) item.
