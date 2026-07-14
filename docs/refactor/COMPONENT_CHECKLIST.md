# Component / File Checklist

Legend: **Reviewed** ✅ audited · **Refactored** 🔧 changed this effort ·
**Reusable** ♻️ promoted/extracted for reuse · **Follow-up** ⚠️ needs later work ·
**Done** ✔️ fully complete (reviewed + any needed refactor applied).

All files below are **Reviewed ✅** as of session 1. Refactor columns start empty.

## packages/ui

| File                              | Refactored | Reusable | Follow-up | Notes                                           |
| --------------------------------- | ---------- | -------- | --------- | ----------------------------------------------- |
| components/button.tsx             | 🔧         | ♻️       |           | canonical var syntax ✔️                         |
| components/card.tsx               | 🔧         | ♻️       |           | canonical var syntax ✔️                         |
| components/badge.tsx              | 🔧         | ♻️       |           | canonical var syntax ✔️                         |
| components/input.tsx              | 🔧         | ♻️       | ⚠️        | canonical syntax ✔️; still no variant/error API |
| components/empty-state.tsx        | 🔧         | ♻️       |           | now uses `cn()` ✔️                              |
| components/page-header.tsx        |            | ♻️       |           | no className prop — nothing to change ✔️        |
| components/product-card.tsx       | 🔧         | ♻️       |           | `text-white` → token ✔️                         |
| components/section-chip.tsx       | 🔧         | ♻️       |           | now uses `cn()` ✔️                              |
| components/stats-card.tsx         | 🔧         | ♻️       |           | now uses `cn()` ✔️                              |
| components/order-status-badge.tsx | 🔧         | ♻️       |           | derives from `ORDER_STATUS_CONFIG` ✔️ (H fixed) |
| order-status-config.ts            | 🔧         | ♻️       |           | cancelled gradient → red ✔️                     |
| lib/utils.ts (cn)                 |            | ♻️       |           | canonical `cn` source                           |
| styles/globals.css                | 🔧         |          |           | dark-mode tokens added ✔️                       |

## packages/shared

| File           | Follow-up | Notes                                       |
| -------------- | --------- | ------------------------------------------- |
| orderStatus.ts | ⚠️        | canTransition/isTerminalStatus dead → adopt |
| constants.ts   | ⚠️        | PRODUCT_IMAGE_TRANSFORM dead                |
| schemas.ts     | ⚠️        | 6 schemas unused; missing 2 inferred types  |
| index.ts       |           | barrel                                      |

## packages/db

| File                                        | Follow-up | Notes                               |
| ------------------------------------------- | --------- | ----------------------------------- |
| env.ts                                      |           | solid                               |
| client.{browser,server,admin,native}.ts     |           | clean                               |
| storage.ts                                  | ⚠️        | dead PRODUCT_IMAGE_TRANSFORM import |
| queries/{catalog,orders,riders,settings}.ts | ⚠️        | read-only; add write helpers        |
| types.gen.ts                                |           | generated                           |

## apps/ops

| File                                 | Follow-up | Notes                                                          |
| ------------------------------------ | --------- | -------------------------------------------------------------- |
| app/layout.tsx                       | ⚠️        | ThemeProvider/suppressHydration                                |
| app/login/page.tsx                   | ⚠️        | oklch literal                                                  |
| app/(dashboard)/layout.tsx           |           | auth gate ok                                                   |
| app/(dashboard)/page.tsx             | ⚠️        | "today" KPIs all-time                                          |
| app/(dashboard)/orders/page.tsx      | ⚠️        | order asc vs realtime prepend                                  |
| app/(dashboard)/catalog/page.tsx     |           |                                                                |
| app/(dashboard)/accounts/page.tsx    | ⚠️        | inline profiles select                                         |
| app/(dashboard)/settings/page.tsx    |           |                                                                |
| components/orders-board.tsx          | ⚠️        | **numeric bug (H)**; over-scoped; StatCard dup; mutating race  |
| components/catalog-grid.tsx          | ⚠️        | ProductAdminCard dup; DeleteDialog trapped; hover-only actions |
| components/product-form-sheet.tsx    | ⚠️        | inline writes; SheetDescription; Category type                 |
| components/add-product-form.tsx      |           |                                                                |
| components/accounts-table.tsx        | ⚠️        | custom empty state; initials dup                               |
| components/sidebar.tsx               | ⚠️        | direct createClient; dead Inventory icon; initials dup         |
| components/sign-out-button.tsx       | ⚠️        | **dead — delete**                                              |
| components/login-form.tsx            | ⚠️        | shadowing; mixed nav                                           |
| components/maps-toggle.tsx           |           | good (uses helper)                                             |
| components/ui/\* (14)                | ⚠️        | 7 identical w/ shop → promote; dropdown-menu/skeleton dead     |
| lib/{auth,utils}.ts, lib/supabase/\* | ⚠️        | inline profiles in auth.ts; utils dup                          |
| proxy.ts                             | ⚠️        | redirect drops cookies                                         |

## apps/shop

| File                           | Follow-up | Notes                                                                    |
| ------------------------------ | --------- | ------------------------------------------------------------------------ |
| app/layout.tsx                 | ⚠️        | #16a34a; theme wiring                                                    |
| app/page.tsx                   | ⚠️        | no loading/error                                                         |
| app/manifest.ts                | ⚠️        | #16a34a                                                                  |
| app/cart/actions.ts            | ⚠️        | leaks raw errors; dead notes param (logic otherwise sound)               |
| app/cart/page.tsx              |           |                                                                          |
| app/login/page.tsx             |           | Suspense ok                                                              |
| app/orders/page.tsx            | ⚠️        | formatOrderCode dup; auth block dup                                      |
| app/orders/[id]/page.tsx       | ⚠️        | 404-on-error; auth block dup                                             |
| proxy.ts                       |           | ok                                                                       |
| components/auth-form.tsx       | ⚠️        | signup email-confirm; palette colors; inline auth                        |
| components/cart-button.tsx     | ⚠️        | **dead — delete**                                                        |
| components/cart-drawer.tsx     | ⚠️        | stepper dup; red-500                                                     |
| components/cart-view.tsx       | ⚠️        | stepper dup; `<a href>`; double error                                    |
| components/catalog-browser.tsx | ⚠️        | palette greens; a11y toggle/portal; filter chrome dup                    |
| components/location-picker.tsx | ⚠️        | over-scoped; mapbox dup; textarea (0,0)                                  |
| components/order-tracker.tsx   | ⚠️        | over-scoped; mapbox dup; no initial rider fetch; STATUS_SUBTITLES→shared |
| components/shop-header.tsx     | ⚠️        | inline auth; useSearch no-op                                             |
| lib/cart/cart-context.tsx      |           | memoized, good                                                           |
| lib/search-context.tsx         | ⚠️        | unmemoized value                                                         |
| lib/{supabase/\*,utils}.ts     | ⚠️        | utils dup                                                                |
| components/ui/\* (8)           | ⚠️        | 7 identical w/ ops → promote; dialog/drawer/label/skeleton dead          |

## apps/rider (React Native — no shadcn)

| File                            | Follow-up | Notes                                                          |
| ------------------------------- | --------- | -------------------------------------------------------------- |
| app/\_layout.tsx                | ⚠️        | no SafeAreaProvider; renders before session ready              |
| app/login.tsx                   | ⚠️        | hand-rolled form; hardcoded colors                             |
| app/(tabs)/\_layout.tsx         | ⚠️        | inline theming                                                 |
| app/(tabs)/index.tsx            | ⚠️        | STATUS_COLOR dup; no useFocusEffect; refresh stuck             |
| app/(tabs)/history.tsx          | ⚠️        | dup rows; refresh stuck                                        |
| app/(tabs)/profile.tsx          | ⚠️        | **stuck loading (H)**; 3 responsibilities; inline query        |
| app/order/[id].tsx              | ⚠️        | **permanent spinner (H)**; inline write; GPS result ignored    |
| lib/location-task.ts            | ⚠️        | confirm onConflict; GPS leak on external cancel                |
| lib/supabase.ts                 |           | re-export ok                                                   |
| config (babel/eas/app.json/pkg) | ⚠️        | reanimated plugin verify; dead drawer dep; dev-client mismatch |

## Missing shared pieces (to create)

- Promote 7 identical primitives → `@grocery/ui`.
- `@grocery/db` write helpers (updateOrderStatus, assignRider, upsertInventory, product CRUD, upsertRiderLocation, getProfile/getAccounts).
- `<QuantityStepper>`, `useMapboxMap`, `formatOrderCode`/`formatMoney` utils, `useUser`/`requireUser`.
- RN design system: `theme.ts`, `Screen/Card/Button/StatusBadge/OrderCard/StatCard/EmptyState/TextField`, `useCurrentUser`, `useFocusRefetch`.
