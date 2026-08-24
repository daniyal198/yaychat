# YaysApp Current Chat Audit

Milestone: 3 / M2 real-time messaging
Date: 2026-08-12

## Audit Scope

This audit covers the current `backend` and `mobile` code in this workspace. The milestone plan asks to inspect `Indexx-Bitcoin-2-0/bitcoin-yay-mobile`, but that repository is not present under `/Users/user/Documents/Indexx/YayChat`, so this pass audits the migrated/current chat implementation instead.

## Existing Chat Capabilities

- Direct messages: REST send, history, latest-message list, unread counts, read marking, idempotent `clientId` persistence.
- Group messages: REST send, group membership checks, global group fallback, history, paged history, group read state, group unread counts.
- Realtime backend: Socket.IO server with user-private rooms, group rooms, `message:new`, `message:sent`, unread-count events, group join/leave, typing, and count snapshots.
- Message behaviors: replies, reactions, edit/update, delete/recall, file metadata, profanity cleanup, and stable timestamp ordering helpers.
- Safety controls: direct user blocking/reporting, group messaging block, group member block/unblock, admin-only group permissions.
- Mobile UI: chat list, search, new chat, conversation view, optimistic sends, retries, pagination, reactions, replies, forwarding, deletion, edits, attachments, typing display, local unread reconciliation.
- Push: backend notification fanout exists for direct and group messages; mobile push registration/deep-link scaffolding exists.

## Reusable Logic

- Keep the service-adapter API in `mobile/src/yaychat/services/index.ts`; screens already consume a stable chat abstraction.
- Reuse backend message persistence in `ChatMessageService`, especially `clientId` idempotency and paged query helpers.
- Reuse `ChatSocketService` as the realtime transport; it already models user and group rooms.
- Reuse backend block/report/group-membership services for authorization and abuse controls.
- Reuse mobile optimistic reconciliation in `mergeMessages`; it already deduplicates by `clientId` and server id.

## Unnecessary Or Risky Dependencies

- Mobile previously had no Socket.IO client dependency, so backend realtime events could not reach the app. `socket.io-client` is now required for the real-time slice.
- Backend Socket.IO Redis adapter uses a hard-coded Redis host and `REDIS_PASSWORD`; production should move host/port/TLS to environment variables and fail closed for clustered deployments.
- Chat media upload URL generation accepts broad document/video/image types but needs production malware scanning, max-size enforcement, and object ACL review.

## Security Concerns

- Several chat REST routes still accept `email` in query/body and are not consistently guarded by authenticated-user matching. Production must enforce `req.user.email === body.email/query.email`.
- Socket auth currently accepts email from `auth` or query without token verification. This is acceptable only for local/dev; production sockets must verify the same access token as REST.
- Direct typing payloads are not broadcast by the backend yet; group typing broadcasts to a room. Direct typing needs recipient-room routing and sender validation.
- Media attachments store/display `fileUrl` as supplied by the client. Production should require presigned-upload completion checks and allowlisted bucket URLs.

## Performance Concerns

- Mobile still keeps REST polling as a fallback for conversations and messages. This is useful during rollout, but polling intervals should be disabled after socket stability is proven.
- Some unread refreshes call full conversation lists after socket count events. This is safe but can be optimized to targeted count updates.
- Search is currently client-side over loaded conversation pages on mobile. Production global search needs backend indexing and pagination.

## Missing Functionality

- Token-authenticated socket handshake and server-side direct typing emit.
- Offline queue durability for pending sends across app restarts.
- Secure media/voice upload lifecycle: upload, scan, finalize, message attach, expiry/failure handling.
- Push deep-link end-to-end verification from notification tap to exact conversation/message.
- Multi-device reconciliation tests for duplicate sends, reconnects, read receipts, and message ordering.
- Backend authorization hardening for every email-address route.
- End-to-end tests with two real users on two devices/simulators.

## Recommended Reuse

- Keep the current backend REST + Socket.IO architecture.
- Keep the mobile chat service as the only screen-facing data API.
- Keep `clientId` idempotency and optimistic UI reconciliation.
- Keep group membership/block/report services, but add auth checks around all callers.

## Recommended Rebuilds

- Rebuild socket authentication around signed access tokens instead of query email.
- Rebuild media upload as a finalized attachment workflow rather than trusting arbitrary `fileUrl`.
- Replace broad polling with socket-first state plus explicit reconnect resync.
- Move global search to backend indexed endpoints.

## First Implementation Slice Started

- Added a mobile Socket.IO client dependency.
- Added backend socket connection management in the mobile chat adapter.
- Mapped backend socket events into the existing `ChatEvent` stream.
- Joined group rooms from active conversations.
- Emitted group/direct typing intent from the composer.
- Kept REST polling as a fallback while the realtime path is introduced.

## Acceptance-Gate Status

Milestone 3 is not complete yet. The current slice starts real-time delivery integration, but production acceptance still requires authenticated sockets, direct typing backend routing, offline queue persistence, secure media upload finalization, push deep-link verification, and two-user integration/E2E coverage.
