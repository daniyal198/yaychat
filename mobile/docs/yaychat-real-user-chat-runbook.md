# Yay-chat Real-user Chat Runbook

## Current state

The active YaysApp mobile flow under `src/yaychat` can now run in two modes:

- Mock preview mode: `YAYCHAT_USE_BACKEND=false`
- Shared Indexx backend mode: `YAYCHAT_USE_BACKEND=true`

Backend mode uses `API_BASE_URL` and the existing `indexx-exchange-backend`
routes for shared users, direct chat, group chat, unread counts, edits/deletes,
reactions, blocking/reporting, and message history. Foreground chat updates are
polled every few seconds through the same `chatService.subscribeConversation`
contract; Socket.IO can replace polling later without changing screens.

## Local verification

Run from `mobile/`:

```sh
npm test -- --runTestsByPath __tests__/services.test.ts
```

Then run the app and verify:

1. Sign in with any valid email and password of six or more characters.
2. Open Chats, then open a direct chat.
3. Send a message and confirm it changes from sending to sent.
4. Send `oops #fail`, tap the failed message, and confirm only one retried
   message appears.
5. Send a normal text message and confirm the simulated recipient typing state
   appears, followed by an incoming reply.
6. Scroll up in a long group chat and confirm older messages load.
7. Return to the chat list and confirm the latest preview updates.

## Real-user testing requirement

To test with real users, build the mobile app with:

```sh
API_BASE_URL=https://api.v1.indexx.ai
YAYCHAT_USE_BACKEND=true
```

For a local backend, use your machine's LAN IP instead of `localhost` when
testing on physical phones, for example:

```sh
API_BASE_URL=http://192.168.1.25:5000
YAYCHAT_USE_BACKEND=true
```

The backend changes required for YaysApp are:

1. `ChatMessage.clientId` is stored and uniquely indexed per sender.
2. `POST /api/v1/chat/messages` and `POST /api/v1/chat/sendGroupmessage`
   preserve `clientId`.
3. `GET /api/v1/chat/messages/:email/paged` provides direct-message paging.
4. `POST /api/v1/chat/messages/read` accepts `email` for direct read updates.

## Real-user smoke test

1. User A signs in on device A, User B signs in on device B.
2. User A opens Chats -> New chat, selects User B, and sends a message.
3. User B keeps the conversation open and confirms the message appears within
   a few seconds.
4. User B replies; User A confirms the reply appears.
5. User A sends `oops #fail` only in mock mode; in backend mode test retry by
   briefly disabling network, sending a message, restoring network, and tapping
   the failed message. User B should see one copy.
6. Test edit, delete, and reaction from one device; the other device should see
   the update after the next foreground poll.
7. Force-close and reopen both apps; history and unread counts should still be
   loaded from the shared backend.
