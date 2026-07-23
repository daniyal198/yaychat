# YayChat Current State Audit

Last updated: July 17, 2026

## Scope

This audit covers the migrated `mobile` and `backend` applications plus the first YayChat frontend milestone pass completed on July 17, 2026. The original repositories remain unchanged. Generated dependencies, nested Git metadata, signing material, production environment files, credentials, logs, caches, and historical user/export datasets were intentionally not migrated.

## Technology Stacks

### Mobile

- React Native 0.78 and React 19, targeting Android and iOS.
- TypeScript 5 with a mixed TypeScript/JavaScript screen and component codebase.
- React Navigation 7 using auth, bottom-tab, and nested native-stack navigators.
- Axios for REST APIs, AsyncStorage for the JWT/session, Firebase messaging, Google/Apple authentication, React Native Config, SVG assets, and native in-app purchase hooks.
- Jest and the React Native ESLint preset are configured. There is one starter render test.

### Backend

- Node.js, Express 4, and strict TypeScript compiled into `dist`.
- MongoDB/Mongoose for persistence, Redis for cache and Socket.IO scaling, Socket.IO for chat events, and JWT middleware for protected routes.
- AWS S3/SES, Firebase/APNs, Stripe, PayPal, Google Play, Twilio, Brevo, blockchain SDKs, and multiple market-data providers.
- Mocha tests are configured. Domain tests exist for chat, authentication-related services, mining promotions, email validation, orders, notifications, and other exchange features.

## Existing Mobile Features

- YayChat-branded authenticated shell with five top-level tabs: Chats, Contacts, Discover, Services, and Me.
- New frontend-only chat, contact, call, group, Moments, wallet, and mini-app preview surfaces using isolated mock data.
- Email and phone registration/login, password reset, OTP/email verification, invitation/referral capture, Google sign-in, and Apple sign-in.
- JWT persistence in AsyncStorage and authenticated/unauthenticated navigation switching.
- Profile display and editing, additional email/phone, role information, privacy/legal screens, account reporting/deletion, and logout.
- BTCY mining start/status/detail, live estimated balance, mining plans, vesting, unverified/transferable balances, referrals, and reward-related views.
- Subscription catalog, plan details, purchase/payment-method flows, receipt upload, payment confirmation, and subscription tracking.
- Support portal, FAQs, contact form, whitepaper, terms, privacy policy, and user agreement.
- Basic direct chat inbox, user search, direct text thread, referral-group list, unread indicator, timestamps, and client-side profanity filtering.

## Existing Navigation

- Auth flow starts at onboarding (`SliderAuth`) and includes login, registration, phone/email verification, password recovery, invitation, and legal screens.
- Authenticated flow now uses five YayChat tabs: Chats, Contacts, Discover, Services, and Me.
- Services preserves legacy mining, subscription, wallet/balance, support, referral, and whitepaper routes.
- Navigation still carries historical auth and legacy screen structure, but the active signed-in shell is now the YayChat tab layout.

## Existing Backend APIs

- Authentication/user: registration, phone/email login, Google/Apple auth, OTP, password reset/change, profile updates, device tokens, privacy, referrals, account reports, and account deletion.
- Chat: direct and group sends, message history/pagination/counts, read state, unread summaries, custom/referral/admin groups, membership management, edit/delete, reply, reactions, mute, block, report, upload presigning, and Socket.IO events for group rooms, typing, counts, and message updates.
- Mining/rewards: mining cycle control, status, balances, rewards, subscription plans, streaks, transfer history, mining-station dashboards, and reward endpoints.
- Subscriptions/orders/payments: plans, purchases, plan changes, PayPal/Stripe/Google Play webhooks, fiat deposits, order history, and payment-provider flows.
- Wallet/transactions: wallet endpoints, balances, deposits/withdrawals, vesting, exchange/order operations, and transaction history.
- Notifications and support services: device registration, notification list/count/read/delete, email-to-admin, marketing email, KYC/KYB, and additional exchange/platform domains.

## Authentication Flow

The mobile app calls the user APIs and stores the returned token under `userToken`. `AuthContext` checks that key on startup and switches between `AuthNavigator` and the authenticated drawer. Most legacy mobile API calls use email from the decoded JWT, while backend protection is inconsistent: newer mutation routes use `validateAuthHeader`, but several chat and account routes still accept identity from parameters or request bodies.

## Current Chat Functionality

### Working or substantially implemented

- Backend direct messages, groups, membership, read state, unread counts, message replies, edit/delete, reactions, mute, block/report, media upload URLs, and Socket.IO fan-out.
- Mobile direct text inbox/thread, REST fetching/sending, simple unread presentation, referral group entry, and a WebSocket service skeleton.

### Incomplete or disconnected

- Mobile chat exposes only a small subset of backend capabilities.
- The mobile real-time client uses the browser `WebSocket` protocol and a `/api/chat/ws` URL, but the backend serves Socket.IO at `/socket.io/`; these are not protocol-compatible.
- New YayChat conversation, calls, and group-management screens are present, but they are still frontend simulations rather than Socket.IO-backed flows.
- No production-ready mobile UI exists for media/file/voice messages, replies, forwarding, reactions, edit/delete, delivery/read receipts, typing, presence, pin/mute, saved messages, calls, or call history.
- Group creation and group conversation UX are incomplete despite substantial backend group support.
- Presence, last-seen, forwarding, saved messages, calling/signaling, and call history do not have complete backend contracts.

## Mining, Subscription, Wallet, and Balance

- Mining is one of the most complete mobile areas and calls backend status, plan, balance, start/stop, vesting, and order APIs.
- Subscription screens and several payment paths exist; native IAP setup is currently mostly commented out, so store-purchase behavior requires environment/device verification.
- The app shows BTCY unverified and transferable balances and vesting. The backend has broader multi-wallet and transaction functionality than the mobile app currently exposes.
- These legacy features should be preserved and moved behind the YayChat Services tab rather than rewritten during the communication UI migration.

## Known Working Areas

- Core auth state switching and token persistence.
- REST service wrappers for user, mining, subscription, balance, and basic chat APIs.
- Major legacy screen routes and native Android/iOS projects.
- Backend domain breadth, MongoDB models, route/controller structure, and chat Socket.IO server.

## Incomplete Areas and Technical Problems

- Production URLs and OAuth client identifiers are hard-coded in mobile source.
- Multiple backend services contain hard-coded production credentials or private-key material; all must be moved to environment variables and the exposed credentials rotated.
- Backend Redis hosts are duplicated across files and include unsafe fallback credentials.
- The backend is much larger than YayChat and has high startup/configuration coupling to external providers.
- The mobile app has inconsistent styling, large screen components, duplicated navigators, weak route typing, mixed JS/TS, and very limited automated tests.
- Several backend chat routes lack uniform authorization, and some identity parameters are client-controlled.
- No Moments/social-post backend model or API is present.
- No call signaling/media infrastructure is present.
- Wallet send/receive UI requires careful separation between a visual flow and real fund movement.

## Missing Backend Work for Target Features

- Presence and last-seen state with privacy controls.
- Forwarding and a first-class saved-message/bookmark contract.
- Voice/video call signaling, TURN/STUN configuration, call permissions, and call history.
- Moments posts, media, visibility, likes, comments, timelines, moderation, and notifications.
- Contact/friend requests and address-book discovery as a dedicated domain.
- QR identity/payment token contracts and server-side validation.
- Pinned-chat persistence and consistent per-chat mute settings.
- Sticker packs and user sticker ownership/synchronization.

## Reusable Code

- Keep the existing auth context and API wrappers while centralizing configuration and authorization headers.
- Reuse backend chat models/controllers for direct/group text, read state, reactions, replies, edits, deletes, blocking, muting, and media presigning.
- Reuse all mining, subscription, vesting, balance, profile, legal, and support screens through a Services-oriented navigation layer.
- Reuse theme tokens and SVG assets selectively, but introduce a dedicated YayChat component and feature structure for new work.
