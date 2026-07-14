# packages/\* — Audit (ui / shared / db / config)

Status: audited (session 1). No fixes applied yet.

## Dependency rule — CLEAN

No violations. No package imports `apps/*`. `shared` imports nothing downward.
`ui`→`shared` only; `db`→`shared` only. Rule `ui`/`db` → `shared` → nothing holds.

## packages/ui (design system)

**Exists:** button, card, badge, input primitives + compositions (empty-state,
page-header, stats-card, section-chip, product-card) + order widgets
(order-status-badge, order-status-config). Tokens in `styles/globals.css`. `cn` centralized.

**Missing / re-implemented in apps:** Both web apps carry their own `components/ui/`
folders. **7 primitives are byte-for-byte identical across shop & ops** (verified diff):
`dialog`, `label`, `scroll-area`, `separator`, `sheet`, `skeleton`, `sonner`. Ops-only
extras: `select`, `table`, `tabs`, `tooltip`, `avatar`, `dropdown-menu`, `switch`.
Also: `cn` duplicated — both apps ship their own `src/lib/utils.ts`; nothing imports
`cn` from `@grocery/ui`.

**Internal inconsistencies:**

1. Two CSS-var syntaxes: button/badge/card/input use bracket `[var(--color-x)]`; empty-state/page-header/product-card/section-chip/stats-card use canonical `(--color-x)`.
2. `cn` used inconsistently: button/badge/card/input/product-card use `cn()`; empty-state(`:13`)/page-header(`:11`)/section-chip(`:15`)/stats-card(`:20`) use raw template concat `${className ?? ""}` → callers can't override (no tailwind-merge), trailing whitespace.
3. Hardcoded colors bypass tokens: `product-card.tsx:71,78,86` (`text-white`, `hover:bg-(--color-primary)/90`) instead of `--color-primary-foreground` / Button `hover:opacity-90`.
4. Only 2/10 use CVA (button, badge); input has no variant/error API.
5. Button hover drift: default `opacity-90`, secondary `opacity-80`, outline/ghost `bg-accent`.
6. **[BUG] Dark-mode token gaps:** `.dark` (`globals.css:74-94`) omits `--sidebar-*` and `--warning`/`--success` → SectionChip & StatsCard render light colors in dark mode.

## packages/shared (domain)

- Order status **is** single source of truth for enum values (matches PG enum + generated `Constants`, `USER_ROLES` matches too). No drift today.
- Drift only guarded by comments — no test asserting `ORDER_STATUSES` == `Constants.public.Enums.order_status`. Add a type/test assertion.
- **`canTransition`/`isTerminalStatus` (`orderStatus.ts:41-47`) are dead** — never called. Ops board reads raw `ORDER_STATUS_TRANSITIONS`; rider hardcodes next-status. Adopt `canTransition` instead.
- **Zod schemas half-unused (validation gap):** used → `placeOrderSchema`, `productInputSchema`. Unused → `inventoryUpdateSchema`, `updateOrderStatusSchema`, `assignRiderSchema`, `riderLocationSchema`, `profileSchema`, `categorySchema`. Their writes run inline & unvalidated (`orders-board.tsx:94,107`, `product-form-sheet.tsx:135`, `rider/lib/location-task.ts:36`).
- Missing inferred types `UpdateOrderStatusInput`, `AssignRiderInput` (`schemas.ts:72-78`).

## packages/db (data layer)

- Client selection clean/correct (4 factories, subpath exports, injected cookie adapter, singletons). Env validation solid (static refs, throws on missing, public/service split).
- **Query layer is read-only & incomplete — every write bypasses it.** 16 inline `supabase.from(...)` sites incl. all writes: ops `orders-board.tsx:94,107`, rider `order/[id].tsx:84`, rider `location-task.ts:36`, ops `product-form-sheet.tsx:132-143` + `catalog-grid.tsx:46`, shop `cart/actions.ts:44-83`. Inline reads that need helpers: ops `accounts/page.tsx:16` + `lib/auth.ts:31` (profiles), rider `profile.tsx:49`. Add `getProfile`/`getAccounts`.
- **[BUG] Dead import:** `PRODUCT_IMAGE_TRANSFORM` unused in `storage.ts:2` (lint fail) → makes `constants.ts:31` `PRODUCT_IMAGE_TRANSFORM` dead everywhere. Upload helper itself correct.
- `setAppSetting` (`settings.ts:22`) awkward cast but fine.

## Bugs & dead code (consolidated)

1. Dead import `PRODUCT_IMAGE_TRANSFORM` `storage.ts:2` (+ orphan constant `constants.ts:31`).
2. Dead exports `canTransition`/`isTerminalStatus` `orderStatus.ts:41-47`.
3. Unused schemas (validation gap) — see shared.
4. Dark-mode token bug `globals.css:74-94`.
5. `order-status-config.ts` `cancelled` gradient is gray (`:71` `from-gray-500 to-gray-400`) while all other cancelled colors are red — mismatch.
6. Two parallel color systems (config raw palette/hex vs semantic tokens) — drift source.
7. Duplicated `cn` + local `lib/utils` in both apps.
8. `order-status-badge.tsx:4` uses `React.ComponentProps` without `import * as React` (inconsistent house style).
9. 7 identical primitives duplicated across shop/ops (largest single duplication block).

## Recommended new shared components/utilities (ranked)

1. Promote the 7 identical primitives to `@grocery/ui` (dialog, sheet, skeleton, sonner, label, scroll-area, separator).
2. Delete app `lib/utils.ts`; import `cn` from `@grocery/ui`.
3. Add ops-only primitives to shared (select, table, tabs, tooltip, avatar, dropdown-menu, switch).
4. Add db write layer (`updateOrderStatus`, `assignRider`, `upsertRiderLocation`, `upsertInventory`, product CRUD, `getProfile`/`getAccounts`) — home for the unused zod schemas.
5. Spinner/loading primitive.
6. `FormField` (Label+Input+error) wrapper.

## Top fixes (ranked by value)

1. Consolidate the 7 identical primitives into `@grocery/ui`. [Low risk, mechanical]
2. Remove duplicated `cn`/`lib/utils`; import from `@grocery/ui`. [Low]
3. Wire unused zod schemas into write boundaries. [Med]
4. Add db write helpers; route the 16 inline writes through them. [Med]
5. Drift-guard test/type-assertion for enums. [Low]
6. Fix dark-mode tokens (`--sidebar-*`, `--warning`, `--success`). [Low]
7. Remove dead code (`PRODUCT_IMAGE_TRANSFORM`; adopt `canTransition` in ops board). [Low]
8. Fix `product-card.tsx` hardcoded `text-white`/hover (`:71,78,86`). [Low]
9. Standardize className handling (`cn()` everywhere) + one CSS-var syntax repo-wide. [Low]
10. Fix `cancelled` gradient; consider deriving config hex from tokens. [Low / Med]
