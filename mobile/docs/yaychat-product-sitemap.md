# Yay-chat Product Sitemap (Milestone 1)

Status legend: **Confirmed requirement** unless marked _(Placeholder — approved preview)_ or _(Future feature)_.

```
Yay-chat
├── Launch
│   ├── Splash (brand boot screen)
│   └── Session restore
├── Onboarding & Authentication
│   ├── Welcome
│   ├── Sign in
│   ├── Sign up
│   ├── Email verification (preview code 123456)
│   ├── Phone verification (preview code 123456, skippable)
│   ├── Forgot password → Reset password
│   ├── Terms & privacy acceptance (Legal modal)
│   └── First-run onboarding
│       ├── Username selection (availability check)
│       ├── Profile setup (name, bio, avatar style)
│       ├── Permission explanations (notifications, contacts)
│       └── Onboarding complete
├── Chats (tab 1)
│   ├── Chat list (filters: all / unread / groups; pinned; muted)
│   ├── Search conversations & messages
│   ├── Archived chats
│   ├── New chat (direct / group, contact selection)
│   ├── Conversation (1:1 and group)
│   │   ├── Message kinds: text, image, video, file, voice, system
│   │   ├── Stickers / GIFs _(Placeholder — approved preview)_
│   │   ├── Replies, reactions, mentions, pin, copy, forward, delete, recall
│   │   ├── Delivery/read status, typing, presence, failed + retry
│   │   ├── Date & unread separators, upload/download progress
│   │   └── Composer (attachments, emoji)
│   ├── Conversation details (mute, search, media, block, report, archive)
│   ├── Group members & roles, group settings, leave group
│   ├── Shared media
│   ├── Forward picker
│   └── Contact profile
├── Communities (tab 2)
│   ├── Home (my communities + discovery + categories)
│   ├── Community search
│   ├── Community detail (public / private / invite-only states)
│   │   ├── Announcements, events, polls, feed, rules
│   │   ├── Join / request / pending / joined states
│   │   ├── Invite link, report, leave
│   │   └── Admin & moderator views (edit, moderation queue)
│   ├── Community chat (preview of Milestone 3/4 realtime)
│   ├── Members (roles, moderation actions)
│   ├── Create community
│   └── Edit community (details + rules)
├── AI (tab 3)
│   ├── AI home (tools grid, usage/credits, suggested prompts)
│   ├── AI chat (simulated responses; disclaimer states)
│   │   ├── Tools: ask, summarize, translate, email, study, coding, financial
│   │   └── Summarize PDF, image generation _(Placeholder — approved preview)_
│   └── AI history (all / saved, delete)
├── Earn (tab 4) — all balances clearly simulated
│   ├── Earn dashboard (balance, streak, daily check-in, limits)
│   ├── Activities (Chat/Invite/AI/Group to Earn; Shop/Mine/Ads _(Future feature)_)
│   ├── Campaigns → campaign detail
│   ├── Reward history → reward detail (pending / completed / reversed)
│   └── Referral dashboard (code, sharing, anti-abuse warning)
├── Wallet & BTCY preview (progressive disclosure from Earn/Me) — preview only
│   ├── Wallet overview (BTCY, Nuggets, USDT, BTC preview balances)
│   ├── Activity → transaction detail
│   ├── Send preview / Receive preview (QR placeholder)
│   └── Wallet setup _(Future feature — Milestone 7)_
├── Ecosystem discovery (from Me/Earn)
│   ├── Product directory (BTCY, ShopperPal, ReHuman, EMMM, Exchange)
│   └── Product preview (purpose, benefit, earn action, availability)
└── Me (tab 5)
    ├── Profile (view, edit, QR)
    ├── Friends, blocked users, notification center
    ├── Settings: notifications, privacy, chat, community, AI, rewards,
    │   appearance, language, accessibility, data & storage
    ├── Devices / active sessions
    ├── Help center, report a problem, about & legal
    ├── Preview controls (offline/error/latency simulation for review)
    ├── Delete account, sign out
    └── Wallet & ecosystem entry points
```

## Global states (available everywhere)

Loading skeletons, partial loading, empty lists, search-no-results, error-with-retry, offline banner + offline state, session expired, feature coming soon, feature unavailable (flag off), region-unavailable note (EMMM preview), success confirmations (toasts), maintenance/service-unavailable (simulated via Preview controls).

## Open decisions

- Dark mode is deferred (design direction light-first); tracked as a feature flag.
- Calls (voice/video) are out of scope for Milestone 1 (PRD lists them as future).
- Final placement of Wallet once real custody exists (Milestone 7) may move from Me/Earn into a tab.
