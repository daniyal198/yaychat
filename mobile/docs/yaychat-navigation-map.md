# Yay-chat Navigation Map (Milestone 1)

Source of truth: `src/yaychat/types/navigation.ts` and `src/yaychat/navigation/index.tsx`.

## Root navigation

`RootStack` (native stack) switches on auth state from `AppProviders`:

| State | Mounted navigator |
|---|---|
| Booting (session restore) | `SplashView` |
| No session | `Auth` stack |
| Session, `onboarded === false` | `Onboarding` stack |
| Session, onboarded | `Main` tabs + root-level module screens |

Root-level module screens (progressive disclosure — reachable from Earn and Me,
kept out of the tab bar on purpose): `WalletOverview`, `WalletTransactions`,
`TransactionDetail`, `SendPreview` (modal), `ReceivePreview` (modal),
`Ecosystem`, `ProductPreview`, `ComingSoon`.

## Authentication navigation

`Auth` stack: `Welcome` (no header) → `SignIn` / `SignUp` → `VerifyEmail` →
`VerifyPhone` → into onboarding. Side routes: `ForgotPassword` →
`ResetPassword`, `Legal` (modal, terms/privacy).

`Onboarding` stack: `Username` → `ProfileSetup` → `Permissions` →
`OnboardingDone` (no header).

## Main tab navigation (5 tabs)

| Tab | Stack | Screens |
|---|---|---|
| Chats | `ChatsStack` | ChatList, ChatSearch, ArchivedChats, NewChat (modal), Conversation, ConversationDetails, GroupMembers, SharedMedia, ForwardMessage (modal), ContactProfile |
| Communities | `CommunitiesStack` | CommunitiesHome, CommunitySearch, CommunityDetail, CommunityChat, CommunityMembers, CreateCommunity (modal), EditCommunity |
| AI | `AiStack` | AiHome, AiChat, AiHistory |
| Earn | `EarnStack` | EarnHome, RewardHistory, RewardDetail, Referral, CampaignDetail |
| Me | `ProfileStack` | ProfileHome, EditProfile, QrProfile, Contacts, BlockedUsers, Notifications, NotificationSettings, PrivacySettings, ChatSettings, CommunitySettings, AiSettings, RewardsSettings, Appearance, Language, Accessibility, DataStorage, Devices, Help, AboutLegal, DeleteAccount, Developer |

Wallet, BTCY, ShopperPal, ReHuman, EMMM, and Exchange deliberately do **not**
occupy tabs; they enter through Earn (wallet row), Me (Wallet & ecosystem
section), and Ecosystem discovery, per the PRD's progressive-disclosure rule.

## Modal routes

`NewChat`, `ForwardMessage`, `CreateCommunity`, `Legal`, `SendPreview`,
`ReceivePreview` use `presentation: 'modal'`. Bottom sheets (actions,
confirmations) are component-level (`BottomSheet` / `ConfirmSheet`), not routes.

## Cross-stack navigation

Screens inside tab stacks reach root-level screens by casting navigation to the
root type (single helper per feature file). Route params are typed centrally in
`types/navigation.ts`; no stringly-typed params.

## Deep-link strategy (documented now, wired in Milestone 2)

`linkingConfig` in `types/navigation.ts` reserves:

- `yaychat://chat/:conversationId` and `https://yay.chat/chat/...`
- `yaychat://c/:communityId` (community)
- `yaychat://invite/:code` (referral)

Notification taps will resolve through the same table in Milestone 3.

## Future module entry points

`ComingSoon` (root) renders any not-yet-built module from a single route with
title/message params; ecosystem `ProductPreview` is the standard landing for
Milestone 8 integrations.
