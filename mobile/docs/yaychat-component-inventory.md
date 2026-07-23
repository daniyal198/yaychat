# Yay-chat Component Inventory (Milestone 1)

All in `src/yaychat/design/components.tsx` unless noted. "States" lists the
variants each component supports.

| Component | Purpose | States / variants |
|---|---|---|
| `YayText` | Typography primitive | display, title, heading, body, bodyStrong, caption, micro; any token color |
| `Screen` | Safe scroll/fixed page shell | scroll/fixed, padded, pull-to-refresh |
| `Card` | Surface container | static, pressable |
| `SectionHeader` | Section title | with/without action link |
| `Divider`, `Spacer`, `Row` | Layout helpers | — |
| `Button` | Primary action | primary, secondary, ghost, danger; icon, disabled, loading |
| `IconButton` | Icon-only action | color/size, accessibility label |
| `TextField` | Labeled input | label, hint, error, any TextInput prop |
| `SearchBar` | Search input | placeholder, clear affordance, autofocus |
| `SwitchRow` | Setting toggle | label + description |
| `CheckRow` | Checkbox / radio row | checkbox, radio, checked/unchecked |
| `SegmentedTabs` | In-page tab switch | n segments, active |
| `Avatar` | Identity | initials + deterministic color, sizes, online/offline dot |
| `Badge` | Status label | brand, accent, success, warning, danger, info, gold, neutral |
| `CountBubble` | Unread counter | 0 hidden, 99+ cap |
| `Chip` | Filter/tag | default, active, icon |
| `ListRow` | Standard row | icon or avatar, subtitle, right slot, chevron, pressed |
| `Banner` | Inline notice | info, warning, danger, success |
| `MockNotice` | "Simulated data" banner | default & custom text — required on wallet/earn |
| `StateView` | Generic status screen | icon, title, message, action, compact |
| `EmptyState` | Empty list | title, message, action |
| `ErrorState` | Failure | message, retry |
| `OfflineState` | No connection | retry |
| `Skeleton` | Loading shimmer | height/width/round, pulse animation |
| `ListSkeleton` | Row-list placeholder | n rows |
| `AsyncView` | Async orchestrator | loading, offline, error+retry, empty, content |
| `BottomSheet` | Action sheet/modal | title, arbitrary content |
| `ConfirmSheet` | Confirmation | default, destructive |
| `ProgressBar` | Progress/limits | 0–1, tone |
| `StatTile` | Metric tile | icon, tone |
| `BrandMark` | App logo mark | size |
| Toast (via `useToast`) | Transient feedback (`state/AppProviders.tsx`) | success, error, info; auto-dismiss |
| Offline bar (`AppProviders`) | Global offline indicator | on/off (simulated network) |
| `SplashView`, `ComingSoonScreen` (`screens/shared`) | Boot & future-module states | — |

## Composition rules

- Feature screens may add local `StyleSheet`s for layout (e.g. chat bubbles,
  composer) but must consume tokens for every color/spacing/radius value.
- New shared patterns get promoted into the kit rather than copied.
- Global states (no internet, service unavailable, maintenance, session
  expired, permission denied, content unavailable, empty, no results, loading,
  partial loading, error+retry, success, restricted, region/flag-gated, coming
  soon) are all expressible through `StateView`/`AsyncView`/`Banner`/toasts and
  are demoable from Me → Preview controls.
