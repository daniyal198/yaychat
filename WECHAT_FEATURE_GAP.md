# YayChat WeChat Benchmark and Chat Gap Analysis

Last updated: July 21, 2026

## Source of truth

- Primary product source: `yaychat_unified_product_vision_prd.md`
- Technical chat reference only: `../bitcoin-yay-mobile`
- Current WeChat benchmark sources checked on July 21, 2026:
  - Apple App Store: https://apps.apple.com/us/app/wechat/id414478124
  - Google Play: https://play.google.com/store/apps/details?id=com.tencent.mm

## Direction correction

YayChat is a separate product.

- Do not reuse Bitcoin Yay as the full application.
- Use Bitcoin Yay only as a technical reference for chat behavior and chat-related services.
- Build YayChat with its own structure, branding, UI, navigation, package IDs, and roadmap.
- Use WeChat as a functional benchmark, not a design or branding template.

## What exists today in the Bitcoin Yay chat reference

Audited reference files:

- `src/services/webSocket.service.ts`
- `src/services/auth.service.ts`
- `src/screens/chat/ChatInbox.tsx`
- `src/screens/chat/ChatMessage.tsx`
- `src/screens/chat/ReferralChatListScreen.tsx`

What is already present there:

- one-to-one messaging API
- message send and fetch flows
- last-message inbox preview
- unread/read state API
- basic inbox search
- referral-group create/join/list APIs
- group message fetch API
- WebSocket connection, reconnect, group join/leave, group send, typing event
- basic chat UI and date-grouped message history

What is missing or not production-ready there:

- clean group chat UX
- media attachments
- voice notes
- reactions
- replies
- mentions
- pinned messages
- archived chats
- stickers / GIF UX
- calls
- channels / official accounts / mini apps
- chat-native payments
- original YayChat UX and architecture

## PRD-aligned MVP baseline

From the unified PRD, the first YayChat MVP should include:

- authentication
- profiles
- one-to-one messaging
- group chat
- communities
- push notifications
- basic media sharing
- basic moderation
- AI assistant
- daily check-in
- referral system
- reward ledger
- limited BTCY or nugget integration
- analytics and admin tools

Explicitly not MVP:

- wallet transfers
- exchange functions
- prediction markets
- advertising platform
- full commerce
- public mini-app platform

## Comparison matrix

| Feature | WeChat now | Bitcoin Yay chat reference | YayChat PRD | YayChat decision | Complexity | Dependencies |
|---|---|---|---|---|---|---|
| One-to-one messaging | Yes | Yes | Yes | MVP | Low | auth, profile, message API |
| Group messaging | Yes | Partial | Yes | MVP | Medium | group model, membership, moderation |
| Inbox / recent chats | Yes | Yes | Implicit | MVP | Low | message summary API |
| Search in chats | Yes | Partial | Yes | MVP | Medium | indexing, local/server search |
| Read receipts | Yes | Partial | Yes | MVP | Medium | message state model, sync |
| Delivery state | Yes | No clear client support | Not explicit | MVP | Medium | socket events, retry state |
| Typing indicators | Yes | Partial | Not explicit | MVP | Medium | socket events, presence model |
| Media sharing | Yes | No | Yes | MVP | Medium | upload service, storage, preview |
| Voice notes | Yes | No | Yes | Later, but desirable early | Medium | native audio capture, storage |
| Replies | Yes | No | Yes | Later | Medium | message relationship model |
| Reactions | Yes | No | Yes | Later | Medium | reaction API, aggregation |
| Mentions | Yes | No | Yes | Later | Medium | group member parsing, notifications |
| Pinned messages | Yes | No | Yes | Later | Medium | admin roles, message metadata |
| Archived chats | Yes | No | Yes | Later | Low | chat state and filters |
| Communities | Yes | No real implementation | Yes | MVP | High | roles, moderation, discovery |
| Public channels / broadcast surfaces | Yes | No | Yes | Later | High | publishing model, moderation |
| Voice calling | Yes | No | Future | Later | High | RTC, permissions, call signaling |
| Video calling | Yes | No | Future | Later | Very high | RTC infra, performance, moderation |
| Push notifications | Yes | No clear chat-specific flow | Yes | MVP | Medium | FCM/APNs, notification routing |
| Official / business accounts | Yes | No | Not explicit, but aligned | Later | High | verification, support tooling |
| Mini programs / mini apps | Yes | No | Later roadmap | Later | Very high | container/runtime, policy, SDK |
| Social feed / Moments-style layer | Yes | No | Not explicit, but aligned with communities/social | Later | High | feed ranking, comments, moderation |
| In-chat wallet / transfers | Yes in supported regions | No | Wallet is later than MVP | Later / regulated | High | wallet, custody, compliance |
| QR payments / merchant pay | Yes in supported regions | No | Wallet + commerce later | Later / regulated | High | merchant tools, QR, compliance |
| AI assistant | No equivalent core positioning | No | Yes | MVP | High | AI provider, safety, billing |
| AI inside chat | Limited benchmark value | No | Future direction | Later | High | context handling, privacy controls |
| Rewards for activity | No direct equivalent as core model | No | Yes | MVP foundation | High | reward engine, anti-abuse |
| Referral loop | Yes, indirectly via social graph | Partial | Yes | MVP | Medium | referral system, analytics |
| BTCY / nuggets integration | No | No reusable clean chat integration | Yes | MVP-lite | High | reward ledger, token rules |

## Features already available

### In the Bitcoin Yay chat reference

- direct message sending and retrieval
- inbox preview and simple search
- unread state handling
- group-related chat endpoints
- WebSocket foundation for realtime chat and typing

### In the YayChat PRD

- one-to-one messaging
- group chat
- communities
- media sharing
- voice notes
- read receipts
- reactions
- replies
- mentions
- pinned messages
- search
- archived chats
- AI assistant
- rewards
- unified wallet
- future ecosystem integrations

## Features missing from YayChat today

Assuming YayChat starts clean and does not inherit Bitcoin Yay wholesale, the main missing capabilities are:

- a clean YayChat chat domain model
- original YayChat navigation and UI
- production-ready realtime chat client
- group chat UX
- chat search architecture
- media and voice messaging
- moderation tooling
- community model
- notification routing
- AI entry points
- reward event plumbing

## Recommended MVP

Build first:

1. Separate YayChat app shell, branding, navigation, and package identifiers.
2. Chat foundation:
   - one-to-one messaging
   - group chat
   - inbox
   - read and delivery states
   - typing indicators
   - push notifications
3. Basic engagement:
   - communities
   - referral loop
   - daily check-in
   - reward ledger foundation
4. Utility:
   - AI assistant entry point
   - basic media sharing
   - basic moderation

## Recommended later phases

- voice notes if not included in MVP
- replies, reactions, mentions, pinned messages
- channels / public broadcast surfaces
- voice and video calls
- official or business accounts
- in-chat payments
- merchant flows
- mini apps
- deeper Indexx integrations for ShopperPal, ReHuman, EMMM, Exchange

## Not relevant to copy from WeChat

- WeChat branding or visual style
- exact navigation patterns
- exact feed design
- China-specific ecosystem conventions that do not fit Indexx
- copying feature sprawl before proving YayChat behavior

## Region-specific or regulated areas

These should not block the first YayChat release:

- wallet transfers
- QR merchant payments
- exchange connectivity
- BTCY transferability rules
- prediction-market / EMMM flows
- ad rewards with financial value
- any cash-equivalent reward behavior

These require legal, compliance, fraud, custody, and country-support decisions before release.

## Clean implementation guidance

Reuse selectively from Bitcoin Yay only where it helps:

- chat APIs
- WebSocket patterns
- message state logic
- group membership behavior
- inbox/unread handling

Do not carry over:

- Bitcoin Yay screens
- mining flows
- wallet screens
- dashboard structure
- old branding
- old styles
- unrelated product coupling

If reusable chat code is tightly coupled to mining or other product modules, rebuild the behavior cleanly inside YayChat instead of copying the dependency chain.

## Conclusion

WeChat is the benchmark for communication breadth, not the blueprint for YayChat identity.

The correct near-term target is:

- a strong, original YayChat communication product
- with AI, communities, and rewards in the first validated release
- and wallet / crypto / ecosystem integrations layered in after the communication foundation is stable

Bitcoin Yay should now be treated as a chat reference library, not as the YayChat product base.
