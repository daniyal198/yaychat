# Yay-chat Mock API Contracts (Milestone 1)

The mock service layer (`src/yaychat/services/index.ts`) is the frontend's API
contract. Milestone 2/3 must implement endpoints matching these signatures;
screens will not change.

## Transport semantics (`services/client.ts`)

- Every call resolves through `mockRequest(name, resolver, {latencyMs})`.
- Typed failures: `ApiError.code ∈ {validation, unauthorized, server, offline,
  not_found, rate_limited}` — the real API must map HTTP statuses onto the same
  taxonomy (400→validation, 401→unauthorized, 404→not_found, 429→rate_limited,
  5xx→server, network→offline).
- Simulation controls (preview builds only): `simulation.latencyMs`,
  `simulation.offline`, `simulation.failNextRequest`.
- Pagination: `Page<T> = {items, nextCursor}` (cursor-based).
- Auxiliary contracts: `secureTokenStore` (save/load/clear serialized session),
  `analytics.track/screen`, `featureFlags.isEnabled/all`.

## authService
| Method | Request | Response | Errors |
|---|---|---|---|
| signIn | email, password | `Session {token, user, onboarded}` | validation, unauthorized |
| signUp | {name,email,password} | `Session` (onboarded=false) | validation |
| verifyCode | code | void — preview accepts `123456` | validation |
| requestPasswordReset | email | void | validation |
| resetPassword | password | void | validation |
| checkUsername | username | {available} | validation |
| completeOnboarding | {username,bio?} | `Session` (onboarded=true) | — |
| restoreSession | — | `Session \| null` | — |
| signOut / deleteAccount | — | void | — |

## chatService
| Method | Notes |
|---|---|
| listConversations(filter) | `all\|unread\|groups\|archived`; pinned-first sort; embeds `lastMessage` |
| getConversation(id) | not_found on miss |
| getMessages(id, cursor?) | `Page<Message>`, 30/page, cursor walks backwards |
| sendMessage(id, {text, kind?, replyToId?, attachment?}) | validation on empty; `#fail` in text simulates server error; returns persisted message |
| markRead(id) | zeroes unread |
| toggleReaction(id, messageId, emoji) | idempotent toggle per user |
| deleteMessage(id, messageId, recall) | delete-for-me vs recall state |
| pinMessage / forwardMessage / setMuted / setArchived / setPinned | as named |
| createConversation(memberIds, title?) | reuses existing direct; group needs ≥2 members; creator = owner |
| leaveGroup(id) | removes conversation |
| searchMessages(query) | cross-conversation, capped 30 |

Message model: id, conversationId, senderId, kind (`text|image|video|file|
voice|sticker|gif|system`), text, createdAt, status (`sending|sent|delivered|
read|failed`), replyToId?, reactions[{emoji,userIds}], mentions?, pinned?,
deleted?, recalled?, attachment?{name,sizeLabel,durationLabel?}.

Text messages that contain web links are classified by
`screens/chats/linkCards.ts`: recognized Indexx ecosystem domains render as
in-message Action Cards, while any other valid `http(s)` URL renders an External
Link Warning card. This is rendering-only in the mock slice; real handoff and
allowlist enforcement belong to the deep-link module.

## userService
me · updateProfile · contacts · getUser · blockedUsers · setBlocked · report ·
deviceSessions · revokeSession (current session not revocable).

## communityService
discover(category?, query?) · categories() · myCommunities() · get(id) ·
join(id) — public joins instantly, private sets `joinRequested`, invite-only
throws unauthorized · leave · create({name,category,description,privacy}) —
creator becomes admin · update(id, {name?,description?,rules?}) ·
vote(communityId, pollId, optionIndex) — one vote per user ·
postToFeed(communityId, body) · report(communityId, reason).

## aiService
tools() (static incl. `comingSoon`/`disclaimer` flags) · suggestedPrompts() ·
usage() → {usedCredits,totalCredits,plan} · history() · get(id) ·
start(tool, firstPrompt?) · send(conversationId, text, toolId?) — consumes one
credit, throws rate_limited at cap, `#unavailable` simulates provider outage,
returns full conversation with simulated assistant reply · setSaved · remove.

## earnService
summary() → balance, streakDays, checkedInToday, dailyLimit, earnedToday,
referralCode, referrals[], campaigns[] · activities() (status: available /
completed_today / coming_soon / limit_reached, optional progress) · checkIn()
— once per day (validation error on repeat), +20, appends ledger entry ·
history() · rewardDetail(id). Reward statuses: pending → completed → reversed
(with note).

## walletService (preview-only)
assets() — every asset `preview: true` · transactions() — every record
`status: 'preview'` · transaction(id). The real Milestone 7 API must keep the
preview flag until custody is approved.

## ecosystemService
products() · product(id) — availability: `available | preview | coming_soon`.

## notificationService / settingsService
list() + markAllRead() · get() + update(SettingsState).
