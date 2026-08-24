# Module 5 — AI Assistant & Support Desk

Status: **implemented**, pending stakeholder review.
Spans `backend/` and `mobile/`. Follows the per-module output discipline in
`yaysapp_module_development_plan.md` §6.

---

## 1. Objective

A daily AI utility inside YaysApp and the first line of support, with the
governance the milestone requires: explicit consent before private content
reaches a model, enforced usage limits, observable cost, handled provider
outages, reportable outputs, and safety disclaimers on high-risk topics.

## 2. Code and systems inspected

- `mobile/src/yaychat/screens/ai/AiScreens.tsx` — existing mock AI hub, chat, history.
- `mobile/src/yaychat/services/index.ts` — the mock↔backend service seam, including
  the `backendGet/Post/Patch/Delete` helpers and `toApiError` used by M2/M3 chat.
- `mobile/src/yaychat/services/mock/db.ts` — the old `aiUsage` / `aiTools` / `aiConversations` seed.
- `backend/services/base.ts`, `backend/db/base.ts` — `ServiceBase` repository contract.
- `backend/controllers/chatAPI.ts`, `backend/routes/chat.routes.ts`, `backend/helpers/middleware.ts` —
  the controller/route/auth conventions this module matches.
- `backend/services/aiAnswer.service.ts`, `backend/helpers/callHuggingFaceModel.ts` — the
  pre-existing, unrelated wealth-management AI helper (left untouched; see §9).

## 3. Assumptions

- **Provider**: no live provider is configured by default. The service resolves a
  provider from env and falls back to a deterministic offline stub, so a fresh
  checkout works with zero credentials. Free tiers are preferred in the auto-resolution
  order (per the decision recorded in §4).
- **Plans**: two plans (`free`, `plus`) with quotas from env. There is no billing
  integration in this module — plan selection is a parameter, not a purchase.
- **Deployment lag**: the app currently points at production `api.v1.indexx.ai`,
  which does not yet serve `/api/v1/ai`. The mobile adapter detects that once and
  serves the session from an on-device engine implementing the same contract, so
  the milestone is demonstrable before the backend ships.

## 4. Decisions taken

- **AI provider — resolved.** The PRD listed "which AI models and providers will be
  used?" as open. Resolved as: a **provider-adapter layer**, with auto-resolution
  order `gemini → groq → openrouter → openai → anthropic → stub`. Free tiers first,
  per the stakeholder preference for a zero-cost provider at this stage. Swapping
  providers is an env change, not a code change.
- **Consent model.** Two independent switches (`shareChatContent`,
  `shareCommunityContent`), both **deny by default**, plus `saveHistory` and
  `personalization`. Granting one scope never grants the other.
- **Outage behaviour.** A provider failure **degrades** rather than throws: the
  answer still arrives, flagged `degraded`, and the UI says so. A failed request
  that hard-errored would be worse UX and would still consume the user's attention.
- **Branding unchanged.** The AI tab stays branded **aiainai** (the Indexx partner
  product — it has its own logo asset, brand colour, ecosystem entry, and link-card
  rules already in the codebase). The system prompt identifies the assistant as
  "aiainai, the AI assistant built into the YaysApp messaging app by Indexx". The
  support desk is YaysApp's own, not aiainai's.

## 5. Approach

```
mobile screens ──► aiService ──┬─► /api/v1/ai (backend, when deployed)
                               └─► localEngine (same contract, on device)

backend  route ──► controller ──► AiAssistantService
                                   ├─ consent gate      (deny by default)
                                   ├─ quota gate        (requests + spend, per UTC day)
                                   ├─ safety screen     (block / classify risk)
                                   ├─ provider adapter  (gemini|groq|…|stub)
                                   ├─ disclaimers       (financial|legal|medical)
                                   └─ cost accounting   (tokens × list price)
```

Every gate runs **before** the provider call, so a blocked or over-quota request
never leaves the server.

## 6. Files added / changed

### Backend (new)

| File | Purpose |
|---|---|
| `data/aiAssistant.ts` | Domain + transport interfaces |
| `models/aiAssistantConversation.ts` | Assistant threads (soft-deleted) |
| `models/aiAssistantUsage.ts` | Per-user, per-UTC-day counters (unique index) |
| `models/aiAssistantConsent.ts` | Privacy switches, deny-by-default |
| `models/aiAssistantReport.ts` | Reported AI answers |
| `models/aiSupportTicket.ts` | Support tickets + transcript |
| `services/ai/catalog.ts` | Tools, system prompts, suggested prompts |
| `services/ai/safety.ts` | Blocklist + risk classifier + disclaimers |
| `services/ai/pricing.ts` | Token estimation and list-price cost |
| `services/ai/providers/{index,stub,gemini,openaiCompatible,anthropic}.provider.ts` | Provider adapters |
| `services/aiAssistant.service.ts` | Orchestration + gates |
| `services/aiAssistant{Consent,Conversation,Usage,Report}.service.ts`, `services/aiSupportTicket.service.ts` | Repositories |
| `controllers/aiAssistantAPI.ts`, `routes/aiAssistant.routes.ts` | HTTP surface |
| `.env.ai.example` | Provider + quota configuration |

### Backend (changed)

- `index.ts` — registers `app.use("/api/v1/ai", aiAssistantRouter)`.

### Mobile (new)

- `src/yaychat/services/ai/localEngine.ts` — the contract-compatible local engine.
- `src/yaychat/screens/shared/AiAssist.tsx` — the shared in-context AI disclosure + consent flow.
- `__tests__/aiAssistant.test.ts` — 27 tests over the M5 acceptance criteria.

### Mobile (changed)

- `types/models.ts` — `AiUsage` reshaped (requests/tokens/cost), plus `AiConsent`,
  `AiTool`, `AiProviderStatus`, `AiAssistResult`, `SupportTicket`.
- `types/navigation.ts` — `AiSupport`, `AiSupportThread` routes.
- `services/client.ts` — `consent_required` error code; `ai_in_chat`,
  `ai_in_communities`, `ai_support_desk` flags.
- `services/index.ts` — `aiService` rewritten (backend-first + fallback); `toApiError`
  now maps HTTP 429 → `rate_limited` and the `consent_required` body code.
- `services/mock/db.ts` — stale AI seed removed (moved into `localEngine`).
- `screens/ai/AiScreens.tsx` — usage/cost card, provider status, privacy sheet,
  report-an-answer, degraded-answer marker, support desk screens.
- `screens/chats/ChatScreens.tsx` — "Summarize with AI" header action, per-message
  "Translate with AI".
- `screens/communities/CommunityScreens.tsx` — "Summarize with AI".
- `screens/profile/ProfileScreens.tsx` — AI settings now backed by the real consent
  record, plus today's usage/cost.
- `navigation/index.tsx` — registers the two support-desk screens.

## 7. API surface

All paths are under `/api/v1/ai`. Everything except `GET /config` requires a bearer token.

| Method | Path | Notes |
|---|---|---|
| GET | `/config` | Tools, prompts, plan, provider status |
| GET / POST | `/usage`, `/consent` | Usage + cost; privacy switches |
| GET / POST | `/conversations` | History; start a thread |
| GET / DELETE | `/conversations/:id` | Fetch; soft-delete |
| POST | `/conversations/:id/messages` | Send a turn |
| POST | `/conversations/:id/saved` | Bookmark |
| POST | `/assist` | One-shot, consent-gated (`scope: chat \| community`) |
| POST | `/reports` | Report an AI answer |
| GET / POST | `/support/tickets` | List; open (AI answers inline) |
| POST | `/support/tickets/:id/messages` | Reply |
| POST | `/support/tickets/:id/escalate` | Hand to the human queue |

Error bodies carry a `code` (`consent_required`, `rate_limited`, `blocked`,
`validation`, `not_found`) so the client renders the right affordance.

## 8. Tests and results

`mobile`: **100/100 passing across 7 suites** (63 pre-existing + 37 new), `npx jest`.

`__tests__/aiAssistant.test.ts` (27) — service behaviour:

- consent denied by default; chat blocked until opted in; scopes independent;
  `acceptedAt` stamped; history-off does not retain prompts;
- quota reported, tokens accumulate, requests rejected at the cap, over-long prompts rejected;
- prohibited prompts blocked before any provider call; risk categories classified;
  disclaimers appended and not duplicated;
- thread titling, save/unsave/delete, clear-all, 404s, answer reporting, provider status;
- support desk: AI first line, escalation carrying the transcript, AI silence after escalation.

`__tests__/aiScreens.test.tsx` (10) — screen rendering. Mounts the real screens
against the real service layer with only the app contexts stubbed, which catches
the bad-import / missing-prop / first-effect-crash class that otherwise only
surfaces as a redbox on device. Asserts the hub renders tools + privacy + quota,
the offline-provider warning, the financial disclaimer, the history empty state,
and both support-desk states (AI-handling and escalated).

One pre-existing flake was fixed alongside: `App.test.tsx` renders the whole
provider tree and could exceed Jest's 5s default under parallel-worker load, so
it now carries an explicit timeout.

`tsc --noEmit`: `src/yaychat` is **clean**; the 23 remaining errors are pre-existing
in the legacy `src/screens` and `src/components` trees, untouched by this module.
`eslint src/yaychat __tests__`: **0 errors** (style warnings only, all pre-existing patterns).

Backend `tsc --noEmit`: the 14 remaining errors are pre-existing and in unrelated
files (`subscription.service.ts`, `mining.operations.ts`, and others). No new AI
file produces a type error.

### iOS simulator

Built and launched on *iPhone 17 Pro, iOS 26.0.1* (`npx react-native run-ios`):
build succeeded, app installed and launched, boots through splash into the
Explore shell with **no redbox and no error-level entries** in the device log.
Verified again after the final JS changes by relaunching against Metro.

The AI screens themselves were verified by the render tests above rather than by
tapping through the simulator — UI automation needs an accessibility permission
that is not granted on this machine.

## 9. Known limitations

- **No live provider is configured.** Until a key is set (`backend/.env.ai.example`),
  every answer comes from the offline stub and is labelled as such in the UI. This is
  the intended default, not a defect — but it means "AI functions are connected to real
  services" is satisfied by configuration, not by code, and should be verified once a
  key is provisioned.
- **The deployed backend does not yet serve `/api/v1/ai`.** The app runs against the
  local engine until it does. Deploying the backend is what flips it over; no app
  change is needed.
- **Image generation is still stubbed.** Deliberately out of scope for this module.
- **Support tickets have no agent-side UI.** Escalated tickets land in a queryable
  queue (`AiSupportTicketService.escalatedQueue`) but the moderation/agent console is
  M6's admin surface, not this module's.
- **Cost accounting uses list prices.** Free-tier models are priced at 0, which is
  accurate today; the accounting path is exercised regardless so a paid swap reports
  correctly on day one.
- **`SettingsState.ai`** still exists in the mobile settings model but is no longer
  the AI privacy source of truth — consent is. Left in place to avoid touching
  unrelated settings persistence.

## 10. Security and privacy notes

- Private chat and community content is **deny-by-default** and gated server-side;
  the client cannot bypass it, and the in-app flow shows a verbatim preview of what
  will be sent before it is sent.
- Prompts and answers are not persisted when `saveHistory` is off.
- Deleting a conversation soft-deletes and clears its messages, so an open abuse
  report still resolves against a row.
- Quotas are enforced before the provider call, capping both request count and spend.
- **Pre-existing issue, not introduced here:** `backend/helpers/callHuggingFaceModel.ts`
  contains a hard-coded HuggingFace API key as a fallback default. It belongs to the
  unrelated `aiAnswer` investment helper and is untouched by this module, but it should
  be rotated and moved to env config.

## 11. Acceptance criteria

| Criterion (module plan M5) | Status |
|---|---|
| AI on real providers with consent/limits visible | Provider adapter live, auto-resolving with free tiers first; consent and quota surfaced on the hub, in AI settings, and in every in-context flow. Live answers require a key (§9). |
| Outages handled | Provider failure degrades to the offline path with a labelled answer; provider status shown on the hub. |
| Costs observable | Per-day tokens and USD on the hub and in AI settings; per-thread cost in history; per-request tokens in the assist sheet. |
| Support tickets escalate with context | Escalation carries the full AI transcript; the AI stops replying once a human owns the ticket. |
| Explicit consent before private chat content reaches a model | Deny by default, per-scope, enforced server-side with a pre-send disclosure. |
| Disclaimers; no personalised investment advice | Risk classifier appends financial/legal/medical disclaimers; system prompt forbids personalised advice and guaranteed-returns framing. |
| AI inside chats/communities | Summarize a chat, translate a message, summarize a community. |
| AI outputs can be reported | Report action on every assistant answer, with reason and excerpt. |
| Critical AI workflows have automated tests | 27 tests over consent, quota, safety, conversations, and support. |

Ecosystem Action Cards on ecosystem answers remain **mocked pending M4**, as the
module plan specifies.
