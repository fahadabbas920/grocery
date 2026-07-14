# apps/shop — Audit (Next.js 16 customer PWA)

Status: audited (session 1). No fixes applied yet.

## Overview

Customer PWA. **Server-side data access is clean** (query helpers) and `placeOrder`
(`cart/actions.ts`) is the strong spot (re-reads prices/stock, recomputes total, rolls
back on items-insert failure). Client components hold inline auth + two Mapbox map
impls. Large files: `location-picker.tsx` (~460), `order-tracker.tsx` (~300).

## Files reviewed

Router: `app/{layout,page,manifest,globals.css}`, `app/cart/{actions.ts,page.tsx}`,
`app/login/page.tsx`, `app/orders/page.tsx`, `app/orders/[id]/page.tsx`, `proxy.ts`.
Components: `auth-form`, `cart-button` (dead), `cart-drawer`, `cart-view`,
`catalog-browser`, `location-picker`, `order-tracker`, `shop-header`.
lib: `cart/cart-context`, `search-context`, `supabase/{client,server}`, `utils`.
Local UI: `ui/{sonner,sheet,scroll-area,separator}` (used); `ui/{dialog,drawer,label,skeleton}` (dead).
Config: `next.config.ts`, `package.json`, `components.json`, `vercel.json`, `CLAUDE.md`.

## Bugs & dead code (prioritized)

1. **[MED] Textarea fallback stores `(0,0)` coords** `location-picker.tsx:360-372`: when `NEXT_PUBLIC_MAPBOX_TOKEN` unset, submits `lat:0,lng:0` → `placeOrder` stores Gulf-of-Guinea coords. Persist address-only or flag missing coords (verify schema allows null).
2. **[MED] Signup ignores email-confirmation** `auth-form.tsx:59`: unconditional `window.location.replace` after `signUp`; if project requires confirmation there's no session → user bounced as logged-out. Branch on `data.session`, show "check your email".
3. **[MED] Order detail collapses all errors to 404** `orders/[id]/page.tsx:20-25`: transient network error → `notFound()` instead of error state.
4. **[LOW] `placeOrder` leaks raw DB error strings** `actions.ts:72,84` vs friendly strings elsewhere.
5. **[LOW] Rider position no initial fetch** `order-tracker.tsx:200-203`: `riderPos` only from realtime; map hidden until next tick. Seed from a query.
6. **[LOW] `placeOrder` `notes` param dead on client** `actions.ts:22,68` — never collected/sent by `cart-view`.
7. **[LOW] `useSearch()` side-effect call** `shop-header.tsx:14` — no-op "keep provider mounted"; remove.
8. **[LOW] `search-context.tsx:14`** passes fresh object literal as value each render (cart-context correctly memoizes) — memoize.
9. **Dead files:** `components/cart-button.tsx`, `ui/dialog.tsx`, `ui/drawer.tsx`, `ui/label.tsx`, `ui/skeleton.tsx` (unless adopted for loading).
10. **Unused deps:** `react-map-gl`, `@vis.gl/react-google-maps` (only `mapbox-gl` + Google iframe string used).

- GOOD: realtime channels torn down; Mapbox `.remove()` on cleanup; `mousedown` listener removed. No leaks found.

## API / data layer

- Server reads centralized (`getCatalog`, `getCategories`, `getMyOrders`, `getOrderWithItems`, `isMapsEnabled`). Good.
- Inline client Supabase: `auth-form.tsx:42-51` (signIn/signUp), `cart-view.tsx:26-33` (getUser before checkout), `shop-header.tsx:19-33` (getUser/onAuthStateChange/signOut), `order-tracker.tsx:181-206` (realtime, unavoidable but duplicated config).
- No shared `useUser()` hook / `requireUser()` server helper — the `try/getUser/catch redirect` block repeats in 4 server pages (`orders/page.tsx:17-25`, `orders/[id]/page.tsx:10-18`).
- `NEXT_PUBLIC_*` map vars read via `process.env` directly, not through validated `packages/db/src/env.ts`.

## Architecture

- `location-picker.tsx` (~460) over-scoped → split into `useGeolocation`, `useMapboxGeocode`, `<MapboxMap>`, `<LocationModal>`.
- `order-tracker.tsx` (~300) mixes Mapbox map + Google iframe + `RiderMap` + stepper + composition. `STATUS_SUBTITLES:77-83` is domain data → `@grocery/shared`.
- **Two independent Mapbox map impls** with near-identical init/cleanup: `location-picker.tsx:106-167` + `order-tracker.tsx:41-75` → shared `useMapboxMap`.
- Filter UI duplicated within `catalog-browser.tsx` (mobile portal `:243-274` vs desktop popover `:308-320`); `FilterPanelContents` shared but chrome not.

## UI/UX issues (top)

- **[HIGH] Hardcoded palette greens** instead of `--color-primary`: `catalog-browser.tsx` (many: `:72,75,90,93,113,116,186,188,196,235,253,316,337`).
- **[HIGH] Hardcoded red/amber** for error/warning (light-only, breaks dark) while `--color-destructive/--color-warning` exist: `auth-form.tsx:111`, `cart-view.tsx:105`, `cart-drawer.tsx:55`, `location-picker.tsx:313-315`.
- **[MED] Three token syntaxes mixed**: `bg-primary/90` vs `bg-(--color-primary)/90` vs legacy `bg-[var(--color-primary)]`. Standardize canonical.
- **[MED] Empty-cart CTA raw `<a href="/">`** full reload in PWA `cart-view.tsx:65-71` → `next/link`.
- **[MED] No `loading.tsx`/Suspense** for home/orders/order-detail (blank during fetch); `Skeleton` unused.
- **[MED] No `error.tsx`** boundary.
- **[MED] Duplicated quantity stepper** `cart-view.tsx:99-121` + `cart-drawer.tsx:49-67` → `<QuantityStepper>`.
- **[MED] A11y**: password toggle (`auth-form.tsx:100`), quantity buttons, stock toggle as `<button>` without `role="switch"`/`aria-checked` (`catalog-browser.tsx:86-96`), mobile filter portal no `role="dialog"`/focus trap (`:243-274`).
- **[LOW] Error surfaced twice** (inline text + toast) `cart-view.tsx:43-44,51-52,173`.
- **[LOW] `next-themes` wired but no `ThemeProvider`** (toaster theme always "system").
- **[LOW] Hero "full width" comment** but inset by `main` padding.

## Cross-file duplication

- `formatOrderCode()` identical in `orders/page.tsx:9-12` + `order-tracker.tsx:85-88` → shared.
- "is active / not delivered|cancelled" predicate re-derived `orders/page.tsx:61` + `order-tracker.tsx:177`.
- Mapbox init/cleanup duplicated (see Architecture).
- `#16a34a` in 5 places: `layout.tsx:17`, `manifest.ts:11,16`, `location-picker.tsx:140,399`, `order-tracker.tsx:59`.
- Quantity stepper duplicated.
- Auth `getUser` guard block in 4 server entry points.
- **Doc drift:** `apps/shop/CLAUDE.md` still says Google Maps embed + only `GOOGLE_MAPS_API_KEY` and "geolocation MVP — replace with a map picker"; reality is Mapbox primary + full `LocationPicker`. Update.

## Top fixes (ranked by value)

1. Replace hardcoded `green/emerald/red/amber` with tokens (`--color-primary/destructive/warning`). [Low, high impact]
2. Add `loading.tsx` (use `Skeleton`) + `error.tsx` for the 3 async routes. [Low]
3. Delete dead files + unused deps (`react-map-gl`, `@vis.gl/react-google-maps`). [Low]
4. Standardize color-token syntax on canonical `bg-(--color-x)`. [Low]
5. Fix signup email-confirmation flow. [Med]
6. Handle textarea-fallback coords (no `(0,0)`). [Med]
7. Extract `formatOrderCode`→shared, `useMapboxMap` hook, `<QuantityStepper>`. [Low-Med]
8. `useUser()` client hook + `requireUser()` server helper. [Med, auth-sensitive]
9. A11y pass. [Low]
10. Stop leaking raw DB errors; fix 404-on-error; update `apps/shop/CLAUDE.md`. [Low]

Note: server-side money/stock in `cart/actions.ts` is sound — leave as-is.
