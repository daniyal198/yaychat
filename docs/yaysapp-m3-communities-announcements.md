# Module 3 — Communities & Announcements

Status: **implemented**, pending stakeholder review.
Spans `backend/` and `mobile/`. Follows the per-module output discipline in
`yaysapp_module_development_plan.md` §6.

---

## 1. Objective

The gather-and-broadcast layer: the hub's marketing surface.

Public and private communities with discovery, search, join requests and invite
links; roles with real permission enforcement; community chat; polls, events and
rules; official **verified accounts** with a publishing-approval workflow;
broadcast announcements with scheduling, audience/region targeting and read
analytics; reporting, banning, moderation queues, and impersonation detection.

Before this module, communities existed only as mock UI: `communityService`
mutated a seeded array in the app, community chat was a hard-coded transcript
with a canned auto-reply, and the members screen showed the user's contacts with
roles assigned by list position. Everything named above is now real, server-side,
and enforced.

## 2. Code and systems inspected

- `mobile/src/yaychat/screens/communities/CommunityScreens.tsx` — the existing
  seven screens and the mock behaviours they depended on.
- `mobile/src/yaychat/services/index.ts` — the `communityService` mock adapter,
  and the M5 AI adapter whose probe/fallback shape this module reuses.
- `backend/services/chatgroups.service.ts`, `backend/models/ChatGroups.ts`,
  `backend/routes/chat.routes.ts` — the M2 group-chat stack that community chat
  is built on rather than duplicated.
- `backend/services/notificationDelivery.service.ts`,
  `backend/services/notifications/deepLinks.ts` — M6's delivery gates and the
  `community.detail` / `community.chat` routes already registered there.
- `backend/services/moderationCase.service.ts` and `data/yaysTelemetry.ts` —
  the unified moderation queue, whose `ModerationSource` union already declared
  `community_report` in anticipation of this module.
- `backend/services/base.ts`, `backend/db/base.ts` — the `ServiceBase`
  repository contract every service here extends.
- `backend/helpers/middleware.ts` — `validateAuthHeader`.
- `backend/data/user.ts` — `country`, the field region-targeted announcements
  match against.

## 3. Assumptions

- **Community chat is group chat.** A community owns an M2 chat group; joining
  adds the member to it, leaving or being banned removes them. No second message
  store, no second socket.
- **Region means `user.country`.** There is no separate community-profile region,
  so a region-targeted announcement matches the account's country. Members whose
  country is unknown are *excluded* from a region send (§10).
- **Deployment lag.** The app points at production `api.v1.indexx.ai`, which does
  not yet serve `/api/v1/yays/*`. The client probes once and falls back to a
  local engine implementing the same contract, exactly as M5 does.
- **Verification is an admin act.** A community cannot mark itself official;
  `POST /:id/verify` is platform-admin only. Everything downstream — the
  approval workflow, the "official" badge on an announcement — depends on that.
- **The link service is M4's.** An announcement's primary action carries a raw
  label + URL for now; minting it through the signed deep-link service lands
  with M4, as the module plan sequences it.

## 4. Decisions taken

- **Community chat reuses the M2 chat group** rather than adding a
  community-message collection. A community stores `chatGroupId`; the client
  turns it into the ordinary conversation id `group:<id>` and renders it with
  the existing chat plumbing, so sockets, history, receipts and push work
  unchanged and there is exactly one message store in the product.
- **The permission matrix is a pure module.** `services/communities/permissions.ts`
  answers every "may this person do this?" with no database, so the rules that
  decide who can delete someone else's post are tested directly and the API and
  the client agree by construction. The API sends the answers down
  (`canModerate`, `canPublishAnnouncement`) instead of asking the client to
  re-derive them.
- **Four roles server-side, three on the client.** `owner` exists so an admin
  cannot demote or ban the founder, but the app's vocabulary stays
  admin/moderator/member; the payload maps `owner → admin`.
- **Staff act strictly downward.** An admin can act on moderators and members,
  never on another admin; nobody can act on the owner; only the owner can mint
  an admin. Ownership transfer is deliberately *not* an endpoint — it needs its
  own audited flow.
- **A ban outranks everything.** It is checked before the platform-admin escape,
  it survives leaving, and an invite link does not bypass it. Banning also adds
  the person to the chat group's own block list, so even a stray re-add leaves
  them silent.
- **Membership rows are never deleted.** Leaving, being removed, and being
  banned are statuses on one row per (community, person). A ban that vanished
  when someone "left" would be escaped by leaving first.
- **`memberCount` is recomputed, never incremented.** Every membership write
  recounts the active rows, so the number on a card cannot drift.
- **The publishing-approval workflow bites only on official communities.** An
  unverified community's announcement is a post to its own members; an official
  one speaks for a product, so a non-admin publisher's draft is held at
  `pending_approval` — and an admin cannot approve their own draft.
- **Read analytics are rows, not a counter.** One `(announcement, reader)` row
  with a unique index; the denormalised `readCount` is only a cache. Re-opening
  an announcement cannot inflate it, on any device.
- **Delivered-count is recorded at fan-out**, and the fan-out pages through the
  whole membership rather than capping — a broadcast that silently stopped at
  the five-hundredth member would report a read rate that is quietly wrong.
- **Scheduled announcements publish two ways**: a background sweep every minute,
  *and* lazily whenever anyone opens the community. The publish is a
  status-conditional update, so the two paths (and two processes) cannot
  double-send. The sweep is a plain interval rather than a cron entry because
  the Redis leader election that guards the cron table is currently disabled.
- **Impersonation detection is advisory, never blocking.** Blocking on a fuzzy
  name match would stop "BTCY Study Group" while barely inconveniencing an
  actual bad actor. A hit files a moderation report and shows staff a banner;
  the community is created either way.
- **Author identity comes from the session.** `postToFeed` no longer accepts an
  author-name override — a client that could name itself could sign a post as
  "BTCY Official". (This changed one pre-existing mock test; see §8.)
- **Reports reach two queues.** The community's own queue is what its moderators
  work; M6's unified queue imports the same rows for platform staff, keyed by
  `(source, sourceRef)` so importing twice is a no-op.

## 5. Approach

```
                    ┌──────────────────────────────┐
  screens  ───────► │ communityService (mobile)    │
                    │  probe /communities/config   │
                    └───────┬──────────────┬───────┘
                        404 │              │ 200
                            ▼              ▼
                  localEngine     /api/v1/yays/communities
                  (same contract)          │
                                           ▼
                              CommunityDirectoryService
                     ┌─────────┬───────────┼───────────┬──────────┐
                     ▼         ▼           ▼           ▼          ▼
                permissions  announcements  invites  impersonation  M2 chat group
                 (pure)        (pure)       (pure)     (pure)      + M6 delivery
```

Every multi-collection write goes through the orchestrator so four invariants
hold in one place: membership and the chat group's member list never drift; the
member count is recomputed from the rows that define it; an announcement's
fan-out and its delivered-count are written together; a report reaches both
queues.

## 6. Files changed

### Backend (new unless noted)

| File | Purpose |
|---|---|
| `data/yaysCommunities.ts` | Domain types for every collection in the module |
| `services/communities/permissions.ts` | Role ranks, the capability matrix, joinability — pure |
| `services/communities/announcements.ts` | Draft validation, scheduling, approval status, targeting, read rate — pure |
| `services/communities/inviteLinks.ts` | Code minting, slugs, link building/parsing, expiry rules — pure |
| `services/communities/impersonation.ts` | Confusable folding, similarity, detection — pure |
| `services/communities/scheduler.ts` | The scheduled-announcement sweep |
| `models/yaysCommunity.ts`, `…Member`, `…JoinRequest`, `…Invite`, `…Post`, `…Poll`, `…Event`, `…Announcement`, `yaysAnnouncementRead`, `…Report` | Schemas and their indexes |
| `services/yaysCommunity.service.ts` + nine sibling services | Repository access per collection |
| `services/communityDirectory.service.ts` | The orchestrator: payloads, permissions, chat-group sync, delivery |
| `controllers/yaysCommunitiesAPI.ts`, `routes/yaysCommunities.routes.ts` | HTTP surface |
| `services/moderationCase.service.ts` *(modified)* | Imports community reports into M6's unified queue |
| `index.ts` *(modified)* | Mounts the router; starts the sweep |
| `.env.m3.example` | Link origin and sweep configuration |
| `tests/m3/*.test.ts` | 61 tests over the four pure modules |

### Mobile

| File | Purpose |
|---|---|
| `services/communities/localEngine.ts` *(new)* | The same contract served locally, rules included |
| `services/index.ts` *(modified)* | `communityService` rewritten backend-first with the config probe |
| `types/models.ts` *(modified)* | `CommunityMember`, `CommunityInvite`, `ImpersonationFlag`, `AnnouncementStats`; announcement/feed/event fields |
| `types/navigation.ts`, `navigation/index.tsx` *(modified)* | `JoinByInvite` route |
| `screens/communities/CommunityScreens.tsx` *(modified)* | All seven screens rewired; `JoinByInviteScreen` added |
| `__tests__/m3Communities.test.ts` *(new)* | 55 tests |
| `__tests__/services.test.ts` *(modified)* | Two pre-existing community tests updated to the new contract (§8) |

## 7. API surface

`/api/v1/yays/communities` — `GET /config` is public; `validateAuthHeader`
guards everything else, because even discovery has to know whether *this*
person has joined, is banned, or has a request pending.

| Method | Path | Notes |
|---|---|---|
| GET | `/config` | Categories, report reasons, audiences |
| GET | `/` · `/mine` | Discovery (category + search) · joined communities |
| POST | `/` | Create; returns any impersonation flags |
| GET / PATCH | `/:id` | Full payload · edit name, description, rules, privacy |
| POST | `/:id/verify` | Platform-admin only: mark as an official product account |
| POST | `/:id/publishers` | Add/remove an approved publisher |
| POST | `/:id/join` · `/:id/leave` | Join, or raise a request for a private community |
| GET | `/:id/members` | Members, staff first; banned rows for moderators |
| POST | `/:id/members/role` · `/remove` · `/unban` | Roles, remove/ban, lift a ban |
| POST | `/:id/requests/:requestId` | Approve or reject a join request |
| GET / POST | `/:id/invites` | List · mint (optional max-uses and expiry) |
| DELETE | `/:id/invites/:code` | Revoke |
| GET / POST | `/invites/preview` · `/invites/accept` | Redeem a link in two steps |
| POST / DELETE | `/:id/posts` · `/:id/posts/:postId` | Post · remove (author or moderator) |
| POST | `/:id/posts/:postId/like` | Toggle like |
| POST | `/:id/polls` · `/:id/polls/:pollId/vote` | Create · vote once |
| POST | `/:id/events` · `/:id/events/:eventId/rsvp` | Create · RSVP |
| POST | `/:id/announcements` | Publish, schedule, or submit for approval |
| POST | `/:id/announcements/:aid/approve` | Approve or reject a held announcement |
| POST | `/:id/announcements/:aid/read` | Record a read (and whether the action was tapped) |
| GET | `/:id/announcements/:aid/stats` | Delivered, reads, actioned, read rate |
| POST | `/announcements/sweep` | Publish everything now due |
| POST | `/:id/reports` · `/:id/reports/:reportId/resolve` | File · resolve (removal carries through to the content) |

## 8. Tests and results

**Backend: 97 passing** (61 new + 36 from M6),
`TS_NODE_TRANSPILE_ONLY=1 npx mocha --require ts-node/register 'tests/m3/*.test.ts' 'tests/m6/*.test.ts'`.

- `tests/m3/permissions.test.ts` (20) — role ordering; what each rank may and
  may not do; an approved publisher who is only a member *can* publish and
  nothing else; a platform admin gets moderation but never membership powers; a
  banned member — including a banned platform admin — can do nothing; staff act
  strictly downward; the owner is untouchable; only the owner mints an admin;
  ownership transfer is refused to everyone; private communities hide their
  contents; joinability across public/private/invite-only/archived/banned.
- `tests/m3/announcements.test.ts` (21) — draft validation; a past schedule
  means "now" while an unparseable or year-away one is refused; action label and
  link must arrive together; the approval workflow across
  verified × staff × scheduled; due-ness; audience targeting including
  case-insensitive region matching and the exclusion of unknown regions;
  visibility of drafts and rejections; read rate, guarded against divide-by-zero
  and capped at 1.
- `tests/m3/invitesAndImpersonation.test.ts` (20) — codes are fixed-length,
  unambiguous (no `0/O/1/l/i`) and distinct across 200 mints; slugs; both link
  forms parse; revoked/expired/exhausted invites rejected at exactly their
  boundary; name folding across digit and Cyrillic lookalikes; detection of
  exact, confusable, near-miss and "official channel" names, with a legitimate
  "Study Group" left alone and a verified community free to rename itself.

**Mobile: 189/189 passing across 9 suites** (134 pre-existing + 55 new),
`npx jest --runInBand`.

`__tests__/m3Communities.test.ts` (55): the adapter's local fallback and
catalogue; discovery, filtering and search; joining public vs private, invite-only
refusal, leaving, and request approval; permission enforcement (post, vote,
poll/event creation, moderation) from the wrong role; one vote per poll, refused
rather than ignored; RSVP on and off; members listing with staff first, role
promotion, ban → hidden from the active list → unban, and members kept private
to a private community; invite links — mint, preview, redeem into an invite-only
community, and refusal when revoked, exhausted, unknown, **or when the person is
banned**; announcements — immediate publish, scheduling, the lazy publish once
the time passes, region and action-link validation, the approval workflow
including the refusal to self-approve, rejection reasons, one read per reader,
and bounded read-rate stats; reporting with de-duplication and removal carrying
through to the post; impersonation folding and flags; and the community-chat id
mapping.

**Two pre-existing tests in `__tests__/services.test.ts` were updated**, both
because M3 deliberately changed the behaviour they pinned:

- the author-name override on `postToFeed` is gone (identity comes from the
  session), so the test now asserts the post is attributed to the signed-in
  account;
- a second vote is now refused with a `validation` error instead of silently
  ignored, so the UI can say why nothing happened; the test asserts both the
  refusal and that the tally still moved exactly once.

**Typecheck.** Backend `tsc --noEmit`: 14 errors, all pre-existing and in
unrelated files (missing `cache/redis` modules, `notificationHelper`'s `image`
property); no M3 file produces one. Mobile `tsc --noEmit`: `src/yaychat` is
**clean**; the 23 remaining errors are the same pre-existing ones in the legacy
`src/screens` and `src/components` trees recorded in M6.

## 9. Known limitations

- **No web admin console.** Verification and publisher management are API-only,
  as in M6.
- **Announcement action links are raw.** Minting them through the signed
  deep-link service, with per-route kill switches, is M4's scope.
- **Community chat has no per-community moderation of messages.** A banned
  member is removed and blocked at the group, but deleting an individual message
  still goes through the M2 chat surfaces.
- **Region targeting is only as good as `user.country`.** Members with no
  country recorded are never in a region-targeted audience — deliberate, but it
  means an under-populated profile field quietly shrinks reach. The
  delivered-count makes that visible rather than hidden.
- **Discovery search is a regex scan.** Correct and fast at the current scale;
  the text index on the collection is there for when it is not.
- **Local engine ≠ multi-user.** The offline fallback models one account, so
  cross-account cases (a second admin approving your announcement) are only
  exercised against the real backend and in the pure-module tests.
- **A member's `id` in community payloads is their email**, which is what this
  backend joins on everywhere. Screens show name and username, never the id.

## 10. Security and privacy notes

- **Private means private.** A non-member gets a cover payload — name,
  description, member count — and nothing else: no posts, no members, no
  announcements, no join-request list. The check is one function
  (`canReadContent`), used by both the payload builder and the members endpoint.
- **A ban is checked before the platform-admin escape**, so a banned account
  with a staff role elsewhere cannot read or post through the back door.
- **Invite links are credentials.** Random, per-community, revocable and
  optionally single-use or expiring; the use-count is incremented with the limit
  in the query, so two people racing on the last slot cannot both get in. They
  bypass privacy — that is their purpose — but never a ban.
- **No self-approval.** An official announcement must be approved by someone
  other than its publisher, or the workflow is decorative.
- **Author and publisher identity come from the session**, never from the
  request body — the one thing an impersonator would most like to control.
- **Impersonation detection never blocks**, so it cannot be used to squat a name
  or to censor a legitimate community; it files a report for a human.
- **Every state-changing route requires a session**, and each one re-reads the
  caller's membership rather than trusting a client-sent role.
- **Pre-existing issue, not introduced here:**
  `backend/helpers/callHuggingFaceModel.ts` still contains a hard-coded API key
  fallback (flagged in M5 and M6, unchanged).

## 11. Acceptance criteria

| Criterion (module plan M3) | Status |
|---|---|
| Users discover / join / leave / participate | Discovery with category filter and search; instant join for public, request for private, invite for invite-only; leave; posts, likes, polls, events, RSVPs, and community chat on the real M2 transport. |
| Private rules enforced | A non-member of a private community receives a cover payload only; members and moderator endpoints refuse them. Roles are enforced server-side per capability and covered by 20 dedicated tests. |
| Only approved publishers post official announcements | `publish_announcement` requires admin rank or membership of the admin-managed publisher list; on a **verified** community a non-admin publisher's draft is held at `pending_approval`, and self-approval is refused. |
| Announcements schedulable, targetable, measurable | Future schedules held and published by the sweep (and lazily on read); audience `all`/`members`/`region` with region matched against the account country; delivered-count recorded at fan-out and unique read rows behind `readCount`, exposed as a read rate. |
| Moderation reports enter a workflow | Reports from the community, a post, a member or an announcement land in the community's queue (de-duplicated per reporter/target) and are imported into M6's unified queue; resolving with "removed" removes the content; banning removes the member, blocks them in the chat group, and survives leaving and invite links. |
| Impersonation detection | Confusable-folded name comparison against every verified community at create and rename; a hit files a moderation report and warns staff without blocking the write. |
