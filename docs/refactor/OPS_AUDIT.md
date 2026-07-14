# apps/ops — Audit (Next.js 16 admin console)

Status: audited (session 1). No fixes applied yet.

## Overview

Role-gated admin/stock console. Server pages fetch via `@grocery/db/queries` (good);
client components perform mutations inline (to centralize). Uses `@grocery/ui` +
local `components/ui/*` shadcn primitives.

## Files reviewed

Routes/layouts: `app/layout.tsx`, `app/globals.css`, `app/login/page.tsx`,
`app/(dashboard)/{layout,page,orders/page,catalog/page,accounts/page,settings/page}.tsx`.
Components: `login-form`, `sidebar`, `sign-out-button`, `orders-board`, `catalog-grid`,
`add-product-form`, `product-form-sheet`, `accounts-table`, `maps-toggle`.
Local UI: `ui/{avatar,dialog,dropdown-menu,label,scroll-area,select,separator,sheet,skeleton,sonner,switch,table,tabs,tooltip}.tsx`.
Lib/infra: `lib/auth.ts`, `lib/supabase/{client,server}.ts`, `lib/utils.ts`, `proxy.ts`.
Config: `package.json`, `components.json`, `next.config.ts`, `eslint.config.mjs`, `tsconfig.json`, `vercel.json`, `CLAUDE.md`.

## Bugs & dead code (prioritized)

1. **[HIGH] Realtime corrupts `total` type** `orders-board.tsx:77-81`: handler spreads `payload.new` raw. PostgREST returns `numeric` as **string**, so after any realtime event `total` is a string → `revenue` reduce (`:114`) becomes string concat (`0"1200""900"`), and `.toLocaleString()` (`:204,:279`) degrades. Fix: `Number(row.total)` in the callback (shared mapper).
2. **[MED] `mutating` scalar can't track concurrent ops** `orders-board.tsx:69`: two overlapping mutations on different orders → first's `setMutating(null)` re-enables second mid-flight. Use a Set/record keyed by op.
3. **[MED] Missing `SheetDescription`** `product-form-sheet.tsx:165`: Radix a11y warning (no description/aria-describedby).
4. **[MED] Orders list ordering mixed**: initial fetch ascending (oldest first) but realtime INSERT prepends newest (`orders-board.tsx:79`). Fetch descending or re-sort.
5. **[LOW] Realtime ignores DELETE** `orders-board.tsx:76-82`: deleted orders linger until refresh.
6. **[LOW] Proxy redirect drops refreshed cookies** `proxy.ts:37,42`: fresh `NextResponse.redirect` without copying `setAll` cookies.
7. **[LOW] Shadowing + mixed nav** `login-form.tsx:21`: `const { error }` shadows `error` state; `window.location.replace("/")` vs `router.replace/push` elsewhere.
8. **Dead code:** `sign-out-button.tsx` (unused), `ui/dropdown-menu.tsx` (unused), `ui/skeleton.tsx` (unused), dead `Inventory` icon/`Boxes` import in `sidebar.tsx:31` (no `/inventory` route). Reconcile stale `/inventory` mention in `apps/ops/CLAUDE.md:18`.

## API / data layer

- Reads centralized; **writes are all inline** `supabase.from(...)`:
  - `orders-board.tsx:94` assign rider; `:107` status update.
  - `product-form-sheet.tsx:132,134,141,143` product/inventory upserts.
  - `catalog-grid.tsx:46` product delete.
  - `accounts/page.tsx:14` raw `profiles` select inline in the page (others use `@grocery/db`).
  - Only `maps-toggle.tsx:18` uses a helper (`setAppSetting`).
  - Add helpers: `assignRider`, `updateOrderStatus`, `upsertProduct`, `deleteProduct`, `getUsers`.
- Inconsistent error handling: 3 coexisting patterns (destructure-error+toast / try-catch-throw+setError / try-catch+toast). Server pages swallow errors (no error boundary).
- Two browser-client paths: most use `getBrowserSupabase()` wrapper; `sidebar.tsx:24,66` imports `createClient` from `@grocery/db/browser` directly.

## Architecture

- `orders-board.tsx` (~339 lines) over-scoped: realtime + mutations + stat cards + tabs + order card + rider dialog (IIFE at ~:270). Extract `StatCard`, order card, rider dialog; move realtime+mutations to `useOrdersRealtime` hook.
- Local `StatCard` (`orders-board.tsx:50`) duplicates shared `StatsCard`; catalog inlines 3 more stat tiles (`catalog-grid.tsx:161-174`). Three implementations.
- `ProductAdminCard` (`catalog-grid.tsx:76`) reimplements shared `ProductCard`.
- Custom `<button>`s where `@grocery/ui` `Button` fits: rider trigger (`orders-board.tsx:224`), sign-out (`sidebar.tsx:149,159`).
- `DeleteDialog` trapped in `catalog-grid.tsx:31` — no shared confirm dialog.
- Domain `Category` type exported from `product-form-sheet.tsx:16` — should live in `@grocery/shared`.

## UI/UX issues (top)

- Mixed token conventions: `border-(--color-border)` vs `border-border/60`, `bg-card/60`, `bg-muted/30`. Standardize on `-(--color-*)`. [MED]
- Hardcoded hex inline `style={{color}}` for stats `orders-board.tsx:127-133` (`#111/#f59e0b/#16a34a`). [MED]
- Hardcoded palette (`amber-*/green-*/red-*`) across orders-board, sidebar, catalog-grid, product-form-sheet. [MED]
- Three empty-state treatments (shared `EmptyState` / plain `<p>` / custom div) — use shared everywhere. [MED]
- No route `loading.tsx`/`error.tsx` despite `Skeleton` primitive existing. [MED]
- "Delivered today"/"Revenue" KPIs are actually all-time (no date filter) `page.tsx:17-21,44`. [MED]
- Login fields placeholder-only, no `<Label>`/aria. [MED]
- Catalog edit/delete hover-only (`opacity-0 group-hover`), unreachable by keyboard/touch. [MED]
- Toast copy inconsistency ("Update failed" vs "Failed to X"). [LOW]
- Card radius inconsistency `rounded-xl` vs `rounded-2xl`. [LOW]
- Sonner reads `next-themes` but no `ThemeProvider`; `<html>` lacks `suppressHydrationWarning`. [LOW]
- Brand gradient literal `oklch(...)` in `login/page.tsx:7`. [LOW]

## Cross-file duplication

- `initials()` implemented 3× differently: `sidebar.tsx:71-73`, `accounts-table.tsx:29-37`, `orders-board.tsx:292-297`. Extract one util.
- Stat-card UI in 3 places (see above).
- Empty states in 3 styles.
- Card container class string copy-pasted across orders/catalog/settings/dashboard/accounts (shared `Card` unused).
- Sign-out logic duplicated (`sidebar.tsx:65-69` + unused `sign-out-button.tsx`), two client accessors.
- Avatar+name+phone row in `orders-board.tsx:290-329` and `accounts-table.tsx:60-68`.

## Top fixes (ranked by value)

1. Normalize numeric fields in realtime handler (bug 1). [Low risk, high impact]
2. Move mutations into `@grocery/db/queries` helpers. [Low-Med]
3. Standardize color usage on `-(--color-*)` tokens; kill inline hex/palette. [Low, high churn]
4. Consolidate 3 stat cards onto shared `StatsCard`. [Low]
5. Use shared `EmptyState` in catalog + accounts. [Low]
6. Add `loading.tsx`/`error.tsx` + wire `Skeleton`. [Low]
7. Delete dead code + reconcile `/inventory` doc. [Very low]
8. Per-op `mutating` (Set/record). [Low]
9. Fix "today" KPIs or relabel. [Low]
10. A11y pass: login labels, SheetDescription, keyboard/touch-reachable catalog actions. [Low]
