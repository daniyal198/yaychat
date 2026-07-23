# Yay-chat UI System (Milestone 1)

## Identity

Original Yay-chat direction: **"sunrise paper"** — warm cream neutrals, a deep
meadow-green brand color, and a coral accent. Friendly, calm, and readable.
Deliberately distinct from Bitcoin Yay (dark/orange crypto styling) and from
WeChat/WhatsApp/Telegram conventions. Brand mark: green rounded chat bubble
with a coral sparkle satellite (`BrandMark`).

Voice: plain, encouraging, honest — preview features always say they are
previews.

## Tokens (`src/yaychat/design/tokens.ts`)

- **Brand**: meadow scale `#e9f6ef → #0e5637`; primary `brand #1d8f5f`,
  `brandStrong #14724a`, `brandSoft #e9f6ef`.
- **Accent**: coral `#f26b3a` (+ soft `#ffe4d7`) — used for unread counts and
  celebratory moments only.
- **Neutrals**: `paper #fffaf3` (surface), `cream #f7f1e7` (background),
  `sand #efe6d6` (sunken), lines `#e3d8c6 / #ede4d4`.
- **Ink**: `#1c2a22 / #415047 / #68756d / #98a29b` (primary → faint).
- **Semantic**: success `#2f9a67`, warning `#d98a17`, danger `#d0503f`,
  info `#2f6ab8`, gold `#c6942f` (owner/quality badges).
- **Message bubbles**: mine = brand green with white text; theirs = white with
  soft border.
- **Spacing**: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 44.
- **Radius**: 8 / 12 / 16 / 22 / 28 / pill. Cards use 22; avatars use a
  squircle-ish `size/2.6`.
- **Typography**: Avenir Next; display 30/800, title 22/800, heading 18/700,
  body 15/500, bodyStrong 15/700, caption 13/500, micro 11/600.
- **Shadows**: `card` (subtle) and `raised` (overlays/toasts).
- **Avatar palette**: 8 deterministic colors hashed from the display name.

## Principles

1. One kit — screens compose `design/components.tsx`, never restyle ad hoc.
2. Warm neutrals carry the UI; green means action/brand; coral is scarce.
3. Every async surface has skeleton → offline → error(retry) → empty → content.
4. Simulated value (points, balances) always sits under a `MockNotice`.
5. Minimum touch target 44pt; interactive elements carry accessibility labels.
6. Dark mode: deferred (flag `dark_mode: false`) — light-first design
   direction; tokens are structured so a dark palette can be swapped in.

## Iconography

Ionicons, outline variants for inactive/tab states, filled when active. Icon
tiles sit in `brandSoft` rounded squares (`ListRow` icon slot).

## Motion

Subtle only: skeleton pulse, toast fade, sheet slide. No parallax/bounce.
