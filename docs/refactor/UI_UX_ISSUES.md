# UI/UX Issue Tracker

Cross-cutting issue log from the session-1 audit. Status: `open` / `in-progress` /
`fixed` / `wontfix`. Grouped by theme; the same theme often spans multiple apps.

Severity: **H** high · **M** medium · **L** low.

> **Session 2 resolution summary.** Fixed: Theme 1 colors (#1–11, tokens everywhere;
> #6 brand hex centralized as `BRAND_GREEN_HEX`), Theme 2 syntax/`cn` (#12–15),
> Theme 3 states (#16–18 loading/error + shared EmptyState; #19–22 rider via agent),
> Theme 4 a11y (#23, #25, #27, #28, #29; #24 password-toggle done). Still open —
> #24 per-button qty labels, #26 mobile-filter dialog semantics, #30 empty-cart `<a>`,
> #31 card-radius scale, #32 remaining toast copy, #33 double error surface,
> #34 next-themes provider, #36 QuantityStepper extraction. See MASTER_PROGRESS.md
> "Remaining / deferred" for the authoritative list.

---

## Theme 1 — Color tokens vs hardcoded palette (biggest consistency lever)

| #   | Issue                                                                                                   | Location                                                                                   | Sev | Status    | Resolution                                                                           |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --- | --------- | ------------------------------------------------------------------------------------ |
| 1   | Two conflicting status-color sources: `OrderStatusBadge` (`VARIANT_BY_STATUS`) vs `ORDER_STATUS_CONFIG` | packages/ui order-status-badge.tsx vs order-status-config.ts                               | H   | **fixed** | `OrderStatusBadge` now derives from `ORDER_STATUS_CONFIG[status].badge` (S1)         |
| 2   | Hardcoded `green-*`/`emerald-*` instead of `--color-primary`                                            | shop catalog-browser.tsx (13 sites)                                                        | H   | open      | Swap to `--color-primary`                                                            |
| 3   | Hardcoded `red-*`/`amber-*` for error/warn (breaks dark)                                                | shop auth-form.tsx:111, cart-view.tsx:105, cart-drawer.tsx:55, location-picker.tsx:313-315 | H   | open      | Use `--color-destructive`/`--color-warning`                                          |
| 4   | Inline hex `style={{color}}` for KPI values (`#111/#f59e0b/#16a34a`)                                    | ops orders-board.tsx:127-133                                                               | M   | open      | Semantic tokens                                                                      |
| 5   | Hardcoded palette `amber/green/red-*` across cards                                                      | ops orders-board, sidebar, catalog-grid, product-form-sheet                                | M   | open      | Tokens / ORDER_STATUS_CONFIG                                                         |
| 6   | `#16a34a` hardcoded (map markers, manifest, layout)                                                     | shop layout.tsx:17, manifest.ts:11/16, location-picker.tsx:140/399, order-tracker.tsx:59   | M   | open      | Central brand token / CSS var where possible                                         |
| 7   | Brand gradient literal `oklch(...)`                                                                     | ops login/page.tsx:7                                                                       | L   | open      | `--color-primary`                                                                    |
| 8   | Dark-mode token gaps: `.dark` omits `--sidebar-*`, `--warning`, `--success`                             | packages/ui globals.css:74-94                                                              | M   | **fixed** | Added dark sidebar + warning/success tokens (S1)                                     |
| 9   | `cancelled` gradient gray, not red                                                                      | packages/ui order-status-config.ts:71                                                      | L   | **fixed** | `from-red-600 to-red-400` — matches red family (revert if muted look preferred) (S1) |
| 10  | RN brand green `#16a34a` hardcoded 20+ times, no tokens                                                 | rider all screens                                                                          | H   | open      | `theme.ts` tokens                                                                    |
| 11  | RN one-off blue `#1d4ed8` maps button                                                                   | rider order/[id].tsx:210                                                                   | L   | open      | theme token                                                                          |

## Theme 2 — CSS-var syntax / className handling

| #   | Issue                                                                     | Location                                                                   | Sev | Status      | Resolution                                                                         |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --- | ----------- | ---------------------------------------------------------------------------------- |
| 12  | Legacy `[var(--color-x)]` vs canonical `(--color-x)`                      | packages/ui button/badge/card/input; shop cart-button; scattered           | M   | **partial** | packages/ui converted (S1); shop cart-button pending deletion; apps still to sweep |
| 13  | Three syntaxes mixed (`primary/90`, `(--color-primary)/90`, `[var(...)]`) | shop auth-form/cart-view/cart-drawer/header                                | M   | open        | Canonical form                                                                     |
| 14  | Mixed token conventions (`border-(--color-border)` vs `border-border/60`) | ops orders-board, product-form-sheet, catalog-grid                         | M   | open        | Standardize                                                                        |
| 15  | Raw template concat instead of `cn()` (no override/merge)                 | packages/ui empty-state:13, page-header:11, section-chip:15, stats-card:20 | L   | **fixed**   | empty-state/section-chip/stats-card → `cn()`; page-header has no className (S1)    |

## Theme 3 — Loading / empty / error states

| #   | Issue                                                         | Location                                            | Sev | Status | Resolution                       |
| --- | ------------------------------------------------------------- | --------------------------------------------------- | --- | ------ | -------------------------------- |
| 16  | No `loading.tsx`/Suspense for async routes                    | shop home/orders/order-detail; ops dashboard routes | M   | open   | Add route loading w/ Skeleton    |
| 17  | No `error.tsx` boundary                                       | shop + ops routes                                   | M   | open   | Add error boundary + retry       |
| 18  | Three empty-state treatments; shared `EmptyState` used in 1/3 | ops orders(shared)/catalog(`<p>`)/accounts(div)     | M   | open   | Use shared `EmptyState`          |
| 19  | Permanent spinner on fetch failure                            | rider order/[id].tsx:46, profile.tsx:37             | H   | open   | try/catch/finally + retry        |
| 20  | `refreshing` stuck true on refresh error                      | rider index.tsx:54, history.tsx:58                  | M   | open   | finally { setRefreshing(false) } |
| 21  | Inconsistent loading UX (spinner/inline/none)                 | rider screens                                       | L   | open   | Standardize                      |
| 22  | Skeleton primitive exists but unused                          | shop + ops                                          | L   | open   | Adopt in #16                     |

## Theme 4 — Accessibility

| #   | Issue                                                          | Location                                      | Sev | Status | Resolution                      |
| --- | -------------------------------------------------------------- | --------------------------------------------- | --- | ------ | ------------------------------- |
| 23  | Login inputs placeholder-only, no `<Label>`/aria               | ops login-form.tsx:33-46; shop auth-form      | M   | open   | Add labels/aria                 |
| 24  | Icon-only buttons missing `aria-label` (password toggle, qty)  | shop auth-form:100, cart-view/cart-drawer qty | M   | open   | aria-label                      |
| 25  | Stock toggle `<button>` without `role="switch"`/`aria-checked` | shop catalog-browser.tsx:86-96                | M   | open   | switch semantics                |
| 26  | Mobile filter portal no `role="dialog"`/focus trap             | shop catalog-browser.tsx:243-274              | M   | open   | dialog semantics                |
| 27  | Missing `SheetDescription`/aria-describedby (Radix warn)       | ops product-form-sheet.tsx:165                | M   | open   | Add description                 |
| 28  | Catalog edit/delete hover-only, unreachable keyboard/touch     | ops catalog-grid.tsx:104-118                  | M   | open   | group-focus-within / persistent |
| 29  | No SafeAreaProvider/SafeAreaView (dep present)                 | rider \_layout / login                        | M   | open   | Wrap in SafeAreaProvider        |

## Theme 5 — Navigation / misc consistency

| #   | Issue                                                       | Location                                               | Sev | Status | Resolution             |
| --- | ----------------------------------------------------------- | ------------------------------------------------------ | --- | ------ | ---------------------- |
| 30  | Empty-cart CTA raw `<a href>` (full reload in PWA)          | shop cart-view.tsx:65-71                               | M   | open   | `next/link`            |
| 31  | Card radius inconsistency `rounded-xl` vs `rounded-2xl`     | ops dashboard/StatsCard vs orders/catalog              | L   | open   | One scale              |
| 32  | Toast copy inconsistency ("Update failed" vs "Failed to X") | ops orders-board:108, catalog-grid, product-form-sheet | L   | open   | Normalize wording      |
| 33  | Error surfaced twice (inline text + toast)                  | shop cart-view.tsx:43-44,51-52,173                     | L   | open   | One surface            |
| 34  | `next-themes` wired but no `ThemeProvider`                  | shop layout + ops sonner                               | L   | open   | Mount provider or drop |
| 35  | Inconsistent card radii/shadow values (RN)                  | rider index/history/order                              | L   | open   | Token-ize              |
| 36  | Duplicated quantity stepper UI                              | shop cart-view:99-121 + cart-drawer:49-67              | M   | open   | `<QuantityStepper>`    |
