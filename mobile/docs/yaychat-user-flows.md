# Yay-chat Primary User Flows (Milestone 1)

All flows are fully completable against mock services.

## 1. First-run sign-up → onboarding
Welcome → Sign up (accept terms) → Verify email (code `123456`) → Verify phone
(or skip) → Username (availability check) → Profile setup → Permissions →
Done → Main tabs. Validation errors render inline; the session persists via
`secureTokenStore`, so relaunch restores straight into tabs.

## 2. Returning sign-in
Welcome → Sign in → tabs. Failure paths: invalid email (validation),
`wrongpass` (unauthorized banner), offline (offline state), forgot password →
reset → back to sign in.

## 3. Send a message (happy + failure)
Chats → conversation → type → send: bubble appears instantly as *sending*,
then *sent*; a simulated reply arrives with a typing indicator. Including
`#fail` in the text produces a *failed* bubble with tap-to-retry. Attachments
(photo/video/file/voice) send mock media messages; stickers/GIFs are marked
coming soon.

## 4. Start a new chat / group
Chat list → ✚ → Direct: pick contact → existing conversation reused. Group:
select 2+ members → name → create → group conversation with system message and
owner role.

## 5. Manage a conversation
Long-press list row → pin/mute/archive. Inside details: mute toggle, shared
media, search, block/report (direct) or members/roles/edit/leave (group,
owner/admin gated).

## 6. Join and participate in a community
Communities → discover/filter/search → public: Join (instant) → feed post,
poll vote (single vote enforced), event RSVP, community chat preview. Private:
Request to join → pending badge. Invite-only: explanatory blocked state.
Admin/mod accounts see edit + moderation queue.

## 7. Create a community
Communities → Create → name/category/description/privacy → detail page as
admin.

## 8. Use Yay AI
AI tab → pick tool or suggested prompt → simulated reply (clearly labeled) →
bookmark to save → history (all/saved). Error demos: `#unavailable` → inline
retry; credits exhausted → rate-limit banner. Financial tool always shows the
disclaimer banner.

## 9. Earn loop
Earn → check in (+20, streak +1, once per day enforced) → activity progress →
reward history (pending/completed/reversed with anti-abuse note) → campaign
detail → referral: copy/share code, see referral statuses.

## 10. Preview wallet & ecosystem
Earn or Me → Wallet preview (MockNotice everywhere) → assets → activity →
transaction detail → send preview (validated form → confirm sheet → "Preview
complete") → receive preview (placeholder QR). Me → Indexx ecosystem →
product previews (BTCY → wallet preview; others → notify-me coming soon).

## 11. Profile & settings
Me → edit profile (validated) → QR profile → settings (toggles persist via
settings service) → devices (revoke non-current) → help/FAQ → delete account
(type DELETE) or sign out.

## 12. Global-state review (stakeholder demo)
Me → Preview controls: toggle offline (banner + offline states with retry),
fail next request (error states), slow latency (skeletons), trigger session
expired (returns to auth). This exercises every required global state without
touching code.
