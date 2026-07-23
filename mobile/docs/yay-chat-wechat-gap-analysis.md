# Yay-chat vs WeChat

Last updated: July 16, 2026

## What WeChat is

WeChat is not just a chat app. It is a "super-app" that combines messaging, voice/video calls, social posting, payments, lightweight apps inside the app, brand/business accounts, and service workflows in one product.

Based on the current public app listing, WeChat supports:

- 1:1 and group chat
- photo, video, voice, and location sharing
- voice and video calls
- social feed features like Moments and Status
- stickers and custom stickers
- WeChat Pay / Wallet in supported regions
- Official Accounts, Channels, and Mini Programs
- message and post translation

Source references:

- Google Play listing for WeChat: https://play.google.com/store/apps/details?hl=en_US&id=com.tencent.mm

## What Yay-chat can do today

From the current mobile and backend repos, the existing app is much closer to a mining/subscription app with basic chat than to a WeChat-style super-app.

Current user-facing capabilities already present:

- account creation and login with email/phone
- Google sign-in and Apple sign-in
- profile and privacy settings
- push token registration
- support/contact flows
- 1:1 text chat inbox
- message search in inbox
- unread dot on chat list
- simple text message thread with timestamps
- profanity filtering before send

Backend or service capabilities that exist but are only partially exposed in the UI:

- mark messages as read
- unread counts and unread summary
- referral group creation and join APIs
- group message fetch APIs
- websocket service for real-time chat events
- default/everyone group test coverage in backend scripts

Repo evidence used for this summary:

- `src/screens/chat/ChatInbox.tsx`
- `src/screens/chat/ChatMessage.tsx`
- `src/services/auth.service.ts`
- `src/services/webSocket.service.ts`
- `src/navigation/TabNavigator.tsx`
- `test_chat_apis.sh` in the backend repo

## Gap vs WeChat

| Area | WeChat level | Yay-chat today | Gap |
| --- | --- | --- | --- |
| Authentication | Mature multi-method onboarding | Present | Small |
| 1:1 text messaging | Full-featured | Basic text only | Medium |
| Real-time delivery | Instant | API polling in UI, websocket not visibly wired | Medium |
| Read receipts / unread management | Mature | Partial backend support | Medium |
| Group chat | Core feature | Backend partial, UI minimal | Large |
| Media messages | Photos, video, voice, files, stickers | Not shipped in chat UI | Large |
| Voice notes | Core | Missing | Large |
| Voice/video calls | Core | Missing | Very large |
| Social feed | Moments / Status / Channels | Missing | Very large |
| Contact graph | Add friends, QR, discovery, sync | Missing | Large |
| Location sharing | Built-in | Missing | Large |
| Translation | Built-in | Missing | Large |
| Payments inside chat | Core in supported regions | Not present as chat-native wallet/payments | Very large |
| Official accounts / business messaging | Core platform feature | Missing | Very large |
| Mini programs / app platform | Core platform feature | Missing | Extremely large |
| Desktop / web companion | Available | Not present | Large |

## Practical conclusion

If the goal is to "match WeChat," the gap is very large. Yay-chat currently covers only the earliest layer of WeChat: account access plus basic direct text messaging.

The current codebase does **not** yet match WeChat in any of these major product layers:

- rich communication
- live communication
- social network/feed
- commerce and wallet
- platform/ecosystem

In practical terms, Yay-chat is currently closer to:

- a branded community/mining app with chat

not to:

- a full communication super-app

## What Yay-chat should add first

### Phase 1: become a strong chat app

These are the most important additions if the immediate goal is to make Yay-chat feel credible as a messaging product:

- real-time message updates using the existing websocket layer
- proper read receipts and delivered states
- group chat UI using the existing backend group endpoints
- image, file, and voice-note messaging
- message reactions, reply, forward, delete, and copy
- typing indicators and online presence
- push notifications for new messages
- chat settings: mute, block, report, archive

### Phase 2: match WeChat's communication layer

- voice calling
- video calling
- contact add/invite flow
- QR-based contact add
- share live location
- richer profiles and friend graph
- stickers, emoji packs, and status updates
- desktop/web chat client

### Phase 3: decide whether to become a super-app

This is where WeChat becomes much bigger than a normal chat app:

- wallet and P2P payments
- merchant payments / QR pay
- official accounts for brands and creators
- mini apps inside Yay-chat
- feed/content surfaces similar to Moments or Channels
- service integrations such as booking, commerce, or support bots

## Recommendation

Do not treat "match WeChat" as one single milestone. Split it into three targets:

1. `Yay-chat MVP`: reliable direct and group messaging
2. `Yay-chat Plus`: media, calls, presence, social sharing
3. `Yay-chat Platform`: payments, business accounts, mini apps

The current repos suggest that Phase 1 is realistic next. Phase 2 is a meaningful product expansion. Phase 3 is a major multi-quarter or multi-year platform effort.
