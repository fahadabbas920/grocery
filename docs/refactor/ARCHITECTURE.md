# Architecture & Conventions

The canonical reference for how code in this monorepo should be structured. Derived
from `CLAUDE.md`, the existing package layout, and the refactor audit. When a rule
here conflicts with existing code, the code is the thing to fix (unless noted).

Last updated: 2026-07-13 (refactor session 1).

---

## 1. Monorepo layout

Turborepo + pnpm workspaces.

```
apps/
  ops    — Next.js 16 admin/stock console (web). Port 3001.
  shop   — Next.js 16 customer PWA (web). Port 3000.
  rider  — Expo SDK 54 / React Native. Rider app.
packages/
  shared — framework-agnostic domain logic (order status machine, zod schemas, constants).
  db     — Supabase client factories, generated types, query functions, storage helpers.
  ui     — shadcn/ui + Tailwind v4 design system (WEB ONLY).
  config — shared tsconfig / eslint bases.
```

### Dependency rule (enforced)

`ui`/`db` → `shared` → nothing. Apps depend on packages. **Never** import an app from
a package. `ui` is web-only and must never be imported by `apps/rider`.

---

## 2. Design system (`@grocery/ui`) — WEB

### Tokens

All color/spacing/radius tokens live in `packages/ui/src/styles/globals.css` as CSS
variables under `@theme inline`. Both web apps import this via
`@import "@grocery/ui/styles.css"` in their own `globals.css`.

Semantic tokens available: `background, foreground, card, popover, primary, secondary,
muted, accent, destructive, border, input, ring, warning, success` (+ `-foreground`
pairs) and sidebar tokens.

### CSS variable syntax — STANDARD: canonical Tailwind v4 form

- ✅ USE: `bg-(--color-primary)`, `text-(--color-foreground)`
- ❌ AVOID: `bg-[var(--color-primary)]` (legacy; flagged by the IDE linter)
- **With an opacity modifier, use the shorthand utility form**, not the arbitrary
  property form: ✅ `bg-primary/90`, `text-destructive`, `bg-muted/40`,
  `text-primary-foreground/80` — ❌ `bg-(--color-primary)/90` (linter flags it).
  Tailwind v4 generates `primary`/`destructive`/`muted`/… utilities from the
  `--color-*` theme tokens, so `text-destructive` === `text-(--color-destructive)`.
  Rule of thumb: no opacity → either form; with `/NN` opacity → shorthand utility.

> **Known debt:** `button.tsx`, `card.tsx`, `input.tsx`, `badge.tsx` still use the
> legacy `[var(--color-x)]` form. Newer components (`empty-state`, `stats-card`,
> `page-header`, `product-card`, `section-chip`) use the canonical form. Standardize
> all of `packages/ui` on the canonical form. (Tracked in UI_UX_ISSUES.md)

### Colors — no hardcoded hex/palette in app code

App components must not hardcode hex (`#16a34a`) or raw palette classes
(`bg-green-100`, `text-amber-700`) for semantic meaning. Use tokens or the shared
`ORDER_STATUS_CONFIG`. Multi-hue status differentiation (amber/blue/purple/green/red)
is centralized ONLY in `ORDER_STATUS_CONFIG`.

### Status color — SINGLE source of truth

`ORDER_STATUS_CONFIG` (`packages/ui/src/order-status-config.ts`) is the one place that
defines per-status color/icon/gradient. `OrderStatusBadge` must derive its colors from
the SAME config.

> **Known bug:** `OrderStatusBadge` currently uses a separate `VARIANT_BY_STATUS` map
> that disagrees with `ORDER_STATUS_CONFIG` (e.g. `placed` = gray vs amber,
> `on_the_way` = green vs purple). The same status renders different colors depending
> on which component draws it. Must be unified. (Tracked in UI_UX_ISSUES.md)

### Component API conventions

- Variants/sizes via `class-variance-authority` (CVA), merged with `cn()`.
- `cn()` = `twMerge(clsx(...))` from `packages/ui/src/lib/utils.ts`.
- Forward refs on primitive-wrapping components.
- Prefer composition (shared primitives) over per-app re-implementation.

### Local `components/ui/*` (per app)

Each web app has a `components/ui/` folder of shadcn primitives (Radix wrappers).
Styling must match the shared token system.

**Promoted to `@grocery/ui` (session 2):** `sheet`, `scroll-area`, `separator`
(import via `@grocery/ui/components/*`) and `Skeleton` (barrel export). The
corresponding Radix deps now live in `packages/ui/package.json`. `cn` is deduped —
both apps' `src/lib/utils.ts` re-export `cn` from `@grocery/ui/lib/utils`.

**Deliberately left per-app:** `sonner` (app-level Toaster, `next-themes` coupling),
`dialog` (only ops uses it now), and ops-only primitives (`select`, `table`, `tabs`,
`tooltip`, `avatar`, `switch`, `label`). Promoting these is a documented follow-up —
it's a dependency-boundary migration that deserves its own reviewed change.

---

## 3. React Native (`apps/rider`) — NO shadcn

shadcn/ui and `@grocery/ui` do **not** apply. The rider app needs its own small,
consistent RN design system: reusable `Button`, `Input`, `Card`, `Screen`, text/
typography, and loading/empty components built on `StyleSheet` with shared tokens
(colors, spacing, radii) in one module. Status color/label must still come from
`@grocery/shared` (labels) — do not re-hardcode the status machine.

---

## 4. Data / API layer

### Client selection (`@grocery/db`)

- `@grocery/db/browser` — Client Components.
- `@grocery/db/server` — Server Components / Route Handlers / Actions (cookie-bound).
- `@grocery/db/admin` — service-role, server only, bypasses RLS.
- `@grocery/db/native` — Expo / React Native.

### Query functions live in `packages/db/src/queries/*`

Reads and common mutations should be centralized query functions, not inline
`supabase.from(...)` chains scattered across components. Target state:

- Components/screens call typed query functions or server actions.
- Inline `supabase.from(...)` in a component is a smell — extract it.

> **Known debt:** several components make direct inline Supabase calls (mutations in
> ops `orders-board.tsx`, auth calls in shop, realtime subscriptions in
> `order-tracker.tsx`, rider screens). Audit docs list each site. Extraction is
> incremental and must preserve RLS/security behavior.

### Money & stock

Never trust client-supplied prices/totals. `apps/shop/src/app/cart/actions.ts`
recomputes totals from DB. Keep all money/stock authority server-side.

### Error handling — STANDARD

- Server actions return a discriminated result: `{ ok: true, ... } | { ok: false, error }`.
- Supabase `getUser()` can THROW (`AuthRetryableFetchError` on 5xx) — always wrap
  server-side `getUser()` in try/catch.
- User-facing errors surface via `sonner` toasts (web). One toast helper/pattern.

---

## 5. Order status machine

Defined once in `packages/shared/src/orderStatus.ts` and mirrored by the Postgres enum

- transition-guard trigger. Change all three together. Allowed transitions live in
  `ORDER_STATUS_TRANSITIONS`; labels in `ORDER_STATUS_LABELS`; presentation in
  `@grocery/ui` `ORDER_STATUS_CONFIG`.

---

## 6. Validation

Validate at boundaries with the zod schemas in `packages/shared/src/schemas.ts`
(server actions, form input, edge functions).

---

## 7. Coding conventions

- TypeScript everywhere; no `any` without cause.
- Match surrounding code's idiom, comment density, and naming.
- Remove unused imports / dead code as encountered.
- Clean up realtime channels and location subscriptions in effect cleanups.
- Keep components single-responsibility; extract large multi-concern components.
