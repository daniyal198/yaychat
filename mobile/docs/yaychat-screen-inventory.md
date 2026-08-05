# Yay-chat Screen Inventory (Milestone 1)

Status: ✅ implemented with mock services · 🔶 approved placeholder (preview
state inside another screen) · 🔷 future milestone entry point.

## Onboarding & authentication (`screens/auth/AuthScreens.tsx`)

| Screen | Status | Notes |
|---|---|---|
| Splash | ✅ | `SplashView` during session restore |
| Welcome | ✅ | brand hero, value bullets, legal links |
| Sign in | ✅ | validation, mock failure (`wrongpass`) |
| Sign up | ✅ | terms & privacy acceptance required |
| Email verification | ✅ | preview code 123456, resend |
| Phone verification | ✅ | skippable |
| Forgot / Reset password | ✅ | success state, back to sign in |
| Terms / Privacy acceptance | ✅ | `Legal` modal (draft copy) |
| Username selection | ✅ | availability check ("taken" is taken) |
| Profile setup | ✅ | name, bio, avatar style chips |
| Avatar setup | 🔶 | style chips within Profile setup (photo upload → Milestone 2) |
| Permission explanations | ✅ | notifications + contacts rationale |
| Onboarding completion | ✅ | completes session (`onboarded: true`) |

## Chats (`screens/chats/ChatScreens.tsx`)

Chat list (filters, pinned, muted, long-press actions) · search conversations &
messages · archived chats · new chat (direct/group contact selection) ·
conversation (1:1 + group) with text/image/video/file/voice/system kinds,
replies, reactions, mentions render, forwarding, delete, recall state, copy,
pin, delivery/read ticks, typing indicator, presence subtitle, failed + retry,
optimistic send, upload-style attachment sends, date + unread separators,
Indexx ecosystem Action Cards, External Link Warning cards ·
conversation details (mute, block, report, archive, search, shared media) ·
group members/roles/settings/leave · forward picker · contact profile — all ✅.
Stickers/GIFs 🔶 (composer rows marked coming soon). Download progress 🔶
(rendered on media placeholders). Calls 🔷 (PRD future).

## Communities (`screens/communities/CommunityScreens.tsx`)

Discovery + categories + search ✅ · public/private/invite-only pages ✅ · join
request & pending states ✅ · feed, announcements, community chat (local
preview), members, admin/moderator views, rules, events, polls, invite links,
report, leave, create, edit ✅. Community analytics 🔷 (Milestone 4).

## AI (`screens/ai/AiScreens.tsx`)

AI home, tools grid, suggested prompts, chat with simulated replies, history,
saved conversations, usage indicator, plan/credits card, error state (retry),
unavailable state, rate-limit state ✅. Summarize PDF 🔶, image generation 🔶
(coming-soon tools). Financial assistant disclaimer state ✅.

## Earn (`screens/earn/EarnScreens.tsx`)

Dashboard, daily check-in, streak, activities (Chat/Invite/AI/Group to Earn ✅;
Shop/Mine/Watch-Ads 🔶 coming soon), reward history + detail
(pending/completed/reversed), limits, campaigns + detail, referral dashboard
(code, sharing), anti-abuse warning ✅. All balances labeled simulated.

## Wallet & BTCY preview (`screens/wallet/WalletScreens.tsx`)

Overview, asset list (BTCY, Nugget, USDT, BTC), transaction history + detail,
send preview, receive preview (QR placeholder), security warning, wallet setup
placeholder, wallet-unavailable state (flag) ✅ — every screen carries a
preview MockNotice; no real transactions implied.

## Ecosystem discovery (`screens/ecosystem/EcosystemScreens.tsx`)

Directory + product previews for BTCY, ShopperPal, ReHuman, EMMM, Exchange —
purpose, benefit, earn action, availability, coming-soon and region notes ✅.
Future products land via the same `ProductPreview`/`ComingSoon` routes 🔷.

## Profile & settings (`screens/profile/ProfileScreens.tsx`)

Profile view/edit, QR profile, friends, blocked users, notification center,
privacy/notification/chat/community/AI/rewards settings, wallet security
placeholder 🔶, device management & active sessions, data & storage, language,
appearance (dark mode 🔶 flag-gated), accessibility, help center, contact
support 🔶, report a problem, terms, privacy policy, delete account, sign out ✅.
Preview controls screen (offline/error/latency simulation) ✅ — dev/demo aid.

## Global states (`design/components.tsx`, `screens/shared/`)

No internet, service unavailable, maintenance (simulated via preview controls),
session expired, permission denied copy, content unavailable, empty list, no
search results, loading, skeleton, partial loading, error with retry, success
confirmation (toasts), account restricted copy (reversed-reward warning),
feature unavailable by region (EMMM note), feature coming soon ✅.
