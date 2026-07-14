# apps/rider — Audit (React Native / Expo SDK 54)

Status: audited (session 1). No fixes applied yet.
Reminder: **no shadcn / no `@grocery/ui`** here — this app needs its own RN design system.

## Overview

Expo Router app. Screens: login, tabs (orders / history / profile), order detail.
`lib/location-task.ts` runs a background GPS TaskManager; `lib/supabase.ts` re-exports
the native client. Data reads mostly go through `@grocery/db` query helpers (good);
writes/auth are partly inline (to fix).

## Files reviewed

- `app/_layout.tsx` — root auth gate + Stack + registers bg location task.
- `app/login.tsx` — email/password sign-in (hand-rolled form).
- `app/(tabs)/_layout.tsx` — bottom tabs with inline theming.
- `app/(tabs)/index.tsx` — active orders list (FlatList, pull-to-refresh).
- `app/(tabs)/history.tsx` — delivered/cancelled history + earnings header.
- `app/(tabs)/profile.tsx` — profile + today/week/all-time stats + sign-out.
- `app/order/[id].tsx` — order detail, maps deep-link, start/deliver, GPS start/stop.
- `lib/location-task.ts` — bg TaskManager location task + start/stop (Expo Go no-op guard).
- `lib/supabase.ts` — re-export `createNativeClient()`.
- config: `app.json`, `babel.config.js`, `metro.config.js`, `eas.json`, `package.json`, `tsconfig.json`.

## Bugs & dead code (prioritized)

1. **[HIGH] Permanent spinner on fetch failure — order detail** `app/order/[id].tsx:46-62`: `.then()` with no `.catch`; rejected fetch leaves `order=null` → infinite spinner, no retry.
2. **[HIGH] Stuck loading — profile** `app/(tabs)/profile.tsx:37-71`: `setLoading(false)` only on success; `if (!user) return` at :42 and any throw leave `loading=true` forever.
3. **[MED] `refreshing` stuck true** `index.tsx:54-58`, `history.tsx:58-62`: `await load()` can throw, so `setRefreshing(false)` never runs.
4. **[MED] GPS start result ignored** `order/[id].tsx:90`: `startLocationSharing()` returns `false` on denied permission / Expo Go but value is discarded; order flips to `on_the_way` with no tracking and no feedback.
5. **[MED] GPS leak on external cancellation**: no realtime subscription; if ops cancels while rider is `on_the_way`, `stopLocationSharing()` never fires. Background GPS keeps running.
6. **[MED-verify] Babel worklets plugin** `babel.config.js:5` `plugins: []` while `react-native-reanimated` 4 is a dep. Verify `babel-preset-expo` injects it under SDK 54.
7. **[LOW] Dead dep `@react-navigation/drawer`** `package.json:20` — no drawer nav exists.
8. **[LOW/MED] Version mismatch** `expo-dev-client ^56` vs Expo SDK `~54`.
9. **[LOW] `icon as "bicycle"` cast** `profile.tsx:130` defeats Ionicons name typing.
10. **[LOW] `isThisWeek` rolling 7-day** vs UI label "This week" `profile.tsx:25-30`.
11. **[LOW] Maps deep-link no fallback** `order/[id].tsx:76-79`: fire-and-forget `openURL`, no `canOpenURL`/catch.

## API / data layer

- GOOD: `index.tsx`/`history.tsx` use `getRiderActiveOrders`/`getRiderOrderHistory`; `order/[id].tsx` uses `getOrderWithItems`.
- Inline status write `order/[id].tsx:84` `supabase.from("orders").update({status})` — no `setOrderStatus` helper in `packages/db`. Add one (shared with ops).
- Inline profile query `profile.tsx:47-51` — add `getProfile()` helper.
- Repeated `supabase.auth.getUser()` (`index:38`, `history:39`, `profile:41`, `location-task:32`) — add `useCurrentUser()` / provide session from `_layout`.
- Client-side stats aggregation `profile.tsx:57-67` under-reports past the 50-row history limit (`riders.ts:14`).
- Read helpers `throw`; call sites don't catch (cause of bugs 1-3).
- `location-task.ts:36` upsert to `rider_locations` — confirm `onConflict: "rider_id"` or it inserts dup rows every 10s.

## Architecture

- `profile.tsx` has 3 responsibilities (identity fetch, profile fetch, stats aggregation w/ local date helpers). Split into `useRiderStats` + presentational.
- `StatCard` defined in `profile.tsx:127-135`; history re-implements the same idea inline.
- No shared list-card despite `index`/`history` rendering structurally identical rows (~80% overlap).
- Session re-derived per screen instead of provided once from `_layout`.
- `_layout.tsx` renders `Stack` before session check completes → cold-start flash.

## Missing RN design system (recommended primitives)

`theme.ts` (colors/spacing/radius/fontSize/shadow), `<Screen>` (safe-area wrapper —
note `SafeAreaProvider` is currently absent though the dep exists), `<Card>`,
`<Button>` (variants + loading/disabled), `<StatusBadge>`, `<OrderCard>`/`<OrderRow>`,
`<StatCard>`, `<EmptyState>`, `<TextField>`. Hooks: `useCurrentUser()`,
`useFocusRefetch(loadFn)`. Utils: `formatMoney`, `formatOrderRef`, shared `STATUS_COLOR`.

## UI/UX issues (top)

- No shared components; card/shadow blocks copy-pasted across 4+ files. [HIGH]
- Brand green `#16a34a` hardcoded 20+ times; no tokens. [HIGH]
- `STATUS_COLOR` duplicated `index.tsx:24-30` ≡ `order/[id].tsx:30-36`. [MED]
- Currency `PKR ${n.toLocaleString()}` in ~10 sites → `formatMoney`. [MED]
- Order-ref chip repeated 3× → `formatOrderRef` + `<OrderRef>`. [MED]
- No `SafeAreaView`/`SafeAreaProvider` (dep present); notch collision risk. [MED]
- Lists fetch only on mount; no `useFocusEffect` → stale after Start/Deliver. [MED]
- Inconsistent card radii/shadow (12 vs 10; opacity .06/.05/.04). [LOW]
- One-off blue `#1d4ed8` maps button. [LOW]
- Inconsistent loading UX (centered spinner / inline / none). [LOW]

## Top fixes (ranked by value)

1. Error handling + loading resolution on every read path (try/catch/finally + retry). Fixes bugs 1-3. [Low risk]
2. `theme.ts` tokens + migrate hardcoded colors/spacing. [Low risk, wide]
3. Extract `Card`/`Button`/`StatusBadge`/`EmptyState`/`OrderCard`. [Low-Med]
4. Handle `startLocationSharing()` failure (bug 4). [Low]
5. `useFocusEffect` refetch on lists. [Low]
6. Centralize status write as `setOrderStatus()` in `@grocery/db` + `canTransition` guard. [Low]
7. Move `STATUS_COLOR` to `@grocery/shared`. [Very low]
8. Verify reanimated Babel plugin; align `expo-dev-client` to SDK 54. [Low, build-affecting]
9. Stop GPS on external order change (realtime/focus) + confirm upsert `onConflict`. [Med]
10. Remove `@react-navigation/drawer`; add `formatMoney`/`formatOrderRef`/`useCurrentUser`. [Very low]
