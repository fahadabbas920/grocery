# Master Refactor Progress

Living index for the full-codebase audit & refactor. Update after every meaningful change.

**Overall completion:** ~80% (audit complete; fix batches A–I applied; large file
splits + a few polish items remain — see "Remaining / deferred").
**Current status:** Session 2 — worked the full batch plan A–I. All 6 workspaces
typecheck green. Rider app refactored (design system + bug fixes) via delegated agent.
Not committed (user commits). Lint could not run — `eslint` binary absent in this
checkout (pre-existing tooling gap), so `tsc` is the verification signal.
**Last updated:** 2026-07-13

---

## Scope (100% coverage target)

| Area            | Files | Audit                             | Refactor                                                                   |
| --------------- | ----- | --------------------------------- | -------------------------------------------------------------------------- |
| apps/ops        | 38    | ✅ OPS_AUDIT.md                   | 🔧 bugs, writes→helpers, colors, states, a11y, dead code                   |
| apps/shop       | 32    | ✅ SHOP_AUDIT.md                  | 🔧 signup fix, colors, states, a11y, dead code, extractions                |
| apps/rider      | 9     | ✅ RIDER_AUDIT.md                 | ✅ design system + all bug fixes (agent)                                   |
| packages/ui     | 13    | ✅ firsthand + PACKAGES_AUDIT.md  | ✅ status unify, syntax, cn, dark tokens, +4 promoted primitives           |
| packages/shared | 4     | ✅ PACKAGES_AUDIT.md              | 🔧 BRAND_GREEN_HEX, ORDER_STATUS_SUBTITLES, formatOrderCode, schemas wired |
| packages/db     | 13    | ✅ PACKAGES_AUDIT.md              | 🔧 write layer (orders/products/profiles), dead import removed             |
| packages/config | 4     | ✅ (clean)                        | ✅ no change needed                                                        |
| supabase        | —     | out of primary scope (schema/RLS) | —                                                                          |

---

## Documents

- `ARCHITECTURE.md` — target conventions & standards (✅ drafted).
- `MASTER_PROGRESS.md` — this file.
- `COMPONENT_CHECKLIST.md` — per-component review state (⏳ populating).
- `UI_UX_ISSUES.md` — issue tracker (⏳ populating).
- `OPS_AUDIT.md` / `SHOP_AUDIT.md` / `RIDER_AUDIT.md` / `PACKAGES_AUDIT.md` — per-area
  deep audits (⏳ populating from agent reports).

---

## Confirmed cross-cutting findings (verified firsthand)

1. **Two conflicting status-color sources.** `OrderStatusBadge` (`VARIANT_BY_STATUS`)
   vs `ORDER_STATUS_CONFIG` disagree (placed gray↔amber, on_the_way green↔purple).
   → unify on `ORDER_STATUS_CONFIG`. **[high]**
2. **CSS-var syntax split in `packages/ui`.** button/card/input/badge use legacy
   `[var(--color-x)]`; rest use canonical `(--color-x)`. → standardize on canonical.
   **[med]**
3. **Duplicated `StatCard`.** `apps/ops/orders-board.tsx` re-implements a stat card
   with hardcoded hex (`#111/#f59e0b/#16a34a`) instead of the shared `StatsCard`.
   **[med]**
4. **Hardcoded palette colors in app code** for semantic meaning (amber/green/red)
   instead of tokens / `ORDER_STATUS_CONFIG`. **[med]**

(Full lists land in the per-area audits + UI_UX_ISSUES.md.)

---

## Work log

- **2026-07-13 (S1a):** Mapped repo (~100 source files). Read all of `packages/ui`,
  both `globals.css`, root config firsthand. Launched 4 read-only audit agents
  (ops / shop / rider / packages). Drafted ARCHITECTURE.md + MASTER_PROGRESS.
- **2026-07-13 (S1b):** All 4 audits complete → wrote OPS/SHOP/RIDER/PACKAGES_AUDIT.md
  - synthesized UI_UX_ISSUES.md + COMPONENT_CHECKLIST.md.
- **2026-07-13 (S1c):** First fix batch — `packages/ui` foundation (typecheck ✅):
  1. Unified status color: `OrderStatusBadge` now derives from `ORDER_STATUS_CONFIG`.
  2. Canonical CSS-var syntax across button/card/input/badge (13 occurrences).
  3. `cn()` in empty-state/section-chip/stats-card (was raw concat).
  4. `product-card` `text-white` → `--color-primary-foreground` token (3 sites).
  5. `cancelled` gradient gray → red (matches family).
  6. Dark-mode tokens: added `--sidebar-*` + `--warning`/`--success` to `.dark`.

---

## Session 2 work log (batches A–I)

- **A — Correctness bugs:** ops realtime numeric coercion (`normalizeOrder`) + DELETE
  handling + per-op `mutating` Set; shop signup email-confirmation state; shop
  order-detail 404-only-on-PGRST116 (else → error boundary). Rider bugs via agent.
- **B — Dead code:** deleted shop `cart-button` + `ui/{dialog,drawer,label,skeleton}`,
  ops `sign-out-button` + `ui/{dropdown-menu,skeleton}`, dead `Inventory` sidebar icon,
  dead `PRODUCT_IMAGE_TRANSFORM` import; removed unused deps (`react-map-gl`,
  `@vis.gl/react-google-maps`, `@radix-ui/react-label`, `@types/google.maps`,
  rider `@react-navigation/drawer`); reconciled ops `/inventory` doc.
- **C — Shared primitives:** promoted `sheet`/`scroll-area`/`separator` + `Skeleton`
  to `@grocery/ui`; deduped `cn` via re-export. (sonner/dialog left per-app — see ARCH.)
- **D — Data layer:** `updateOrderStatus`, `assignRider`, `createProduct`,
  `updateProduct`, `deleteProduct`, `getAccounts`, `getProfile` in `@grocery/db`;
  wired zod (`updateOrderStatusSchema`/`assignRiderSchema`/`productInputSchema`/
  `inventoryUpdateSchema`); routed ops + rider writes through helpers; orders board
  now newest-first.
- **E — Colors:** swept shop greens→`primary`, reds/ambers→`destructive`/`warning`;
  ops hex/palette→`warning`/`success`/`destructive` tokens; `BRAND_GREEN_HEX` for the
  concrete-hex spots (manifest/theme/markers); shared `EmptyState` in catalog+accounts;
  login `oklch` gradient→tokens.
- **F — States:** `error.tsx` + `loading.tsx` for shop (root) and ops (dashboard),
  using shared `EmptyState`/`Skeleton`.
- **G — a11y:** ops login labels + `role="alert"`; `SheetDescription`; catalog-browser
  stock toggle `role="switch"`/`aria-checked`; password-toggle `aria-label`;
  catalog actions keyboard-reachable (`focus-within`).
- **H — Extractions:** `formatOrderCode` + `ORDER_STATUS_SUBTITLES` → `@grocery/shared`.
- **I — Rider:** reviewed agent output (all bugs fixed, RN design system built);
  wired its status write to `updateOrderStatus`.

## Remaining / deferred (next session)

- **Large file splits (deferred — risky, deserve isolated review):** split shop
  `location-picker.tsx` (~460L) and `order-tracker.tsx` into `useGeolocation`,
  `useMapboxMap`, `<MapboxMap>`, `<LocationModal>`, stepper; extract `<QuantityStepper>`
  (cart-view/cart-drawer); `useUser()`/`requireUser()` auth hooks; split ops
  `orders-board.tsx` (StatCard/order-card/rider-dialog + `useOrdersRealtime`).
- **Promote remaining primitives** (sonner/dialog + ops-only) — dep-boundary migration.
- **a11y polish:** per-button qty `aria-label`s; mobile filter portal `role="dialog"`
  - focus trap.
- **Product delivery `(0,0)` coords fallback** — needs a schema/DB decision (make
  `delivery_lat/lng` nullable) before fixing; flagged for the user.
- **Enum drift-guard test** (`ORDER_STATUSES` vs generated `Constants`).
- **Adopt `StatsCard`/`ProductCard`** shared components in ops (consolidate the 3
  stat-card + duplicate product-card implementations).
- **"Delivered today" KPI** actually all-time — filter or relabel.
- **Unused schemas** still open: `riderLocationSchema` (rider bg write),
  `profileSchema`, `categorySchema` (features not built yet).
- **Tooling:** `eslint` binary missing in this checkout — `pnpm lint` can't run.

## Guardrails

- Do NOT commit — the user reviews and commits changes themselves.
- Preserve business logic; change only to fix a genuine bug.
- Keep each change set small and reviewable.
- RLS is the security boundary; never weaken it during API-layer extraction.
