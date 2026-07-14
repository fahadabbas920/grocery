# Grocery Delivery Platform — Monorepo

Hyperlocal, single-vendor grocery delivery. Cash on delivery. Three surfaces share
one Supabase backend.

## Architecture

Turborepo + pnpm workspaces.

```
apps/
  ops    — Next.js 16. Admin + Stocks, role-gated (admin | stock_keeper). Port 3001.
  shop   — Next.js 16 PWA. Customer ordering + live tracking. Port 3000.
  rider  — Expo SDK 54 (React Native). Assigned orders, background GPS, deliver.
packages/
  shared — framework-agnostic domain logic: order status machine, zod schemas, constants.
  db     — Supabase client factories (browser/server/admin/native), generated types, queries, storage helpers.
  ui     — shadcn/ui + Tailwind v4 (web apps only).
  config — shared tsconfig / eslint.
supabase/
  migrations — schema, RLS, storage, triggers, realtime.
  functions  — edge functions.
  seed.sql   — sample catalog.
```

### Dependency rule

Apps depend on packages; packages depend only on each other downward
(`ui`/`db` → `shared` → nothing). Never import an app from a package.

### Client selection (`@grocery/db`)

- `@grocery/db/browser` — Next.js Client Components.
- `@grocery/db/server` — Next.js Server Components / Route Handlers / Actions (cookie-bound).
- `@grocery/db/admin` — service-role, **server only**, bypasses RLS.
- `@grocery/db/native` — Expo / React Native (AsyncStorage session).

## Tooling versions

Next.js 16.2 · React 19.2 (web) · Expo SDK 54 (RN 0.81, React 19.1) · Tailwind v4 · Supabase JS v2 + @supabase/ssr · pnpm 10.26 · Turborepo 2.

## Commands

```
pnpm install            # install all workspaces
pnpm dev                # run all dev servers (turbo)
pnpm -F @grocery/ops dev
pnpm -F @grocery/shop dev
pnpm -F @grocery/rider dev
pnpm typecheck          # tsc across workspaces
pnpm lint
pnpm db:push            # apply migrations to the linked Supabase project
pnpm db:types           # regenerate packages/db/src/types.gen.ts from the linked project
```

## Conventions

- **No hardcoded secrets.** All config comes from env via `packages/db/src/env.ts`
  (validated, throws if missing). Only `.env.example` files are committed.
- **Order status** is defined once in `packages/shared/orderStatus.ts` and mirrored by
  the Postgres enum + transition-guard trigger. Change all three together.
- **Validate at boundaries** with the zod schemas in `packages/shared/schemas.ts`.
- **Trust the server for money/stock.** Order totals are recomputed server-side
  (see `apps/shop/src/app/cart/actions.ts`); client prices are never trusted.
- RLS is the real security boundary; UI role checks are convenience only.

## Out of scope (MVP)

Card/online payments, promotions, reviews, automated rider assignment, multi-branch,
app-store submission. See the scope document.
