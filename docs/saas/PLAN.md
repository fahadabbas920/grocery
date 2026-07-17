# Ops → Multi-Tenant SaaS (Vendors + Private Admin)

> **Status (2026-07-17): Phase 0 + Phase 1 implemented.** Migrations pushed to the linked
> project + `db:types` regenerated; all 6 workspaces typecheck and both web apps build clean.
> Done: `stores`/`store_members`, parent/child `orders`→`store_orders`, `auth_store_id()`,
> rider-dispatch + store-status guards, tenant RLS, realtime; backfilled the current shop as
> the "Default Store" and split existing orders (validated on throwaway Postgres, then pushed).
> `packages/db` reshaped; shop checkout splits per shop; shop tracker/history show
> parent+children; ops board on `store_orders` with **admin-only central dispatch** (vendors
> get a read-only rider view), store-scoped catalog/dashboard; rider app on the child shape;
> blended "Sold by <Shop>" storefront tag.
>
> **Phase 2 shipped:** admin **Vendors** section (stores CRUD + owner onboarding with
> temp password + activate/suspend), vendor **Store settings** page, admin **Rider
> dispatch** view, RLS recursion fix (migration 5), "Delivered today" KPI fix, enum
> drift-guard, shared `QuantityStepper` (dedup + a11y). Auth users reset to one per role.
>
> **Migration `20260718000001` pushed + types regenerated.** Shipped on top of it:
> open/closed toggle on Store settings, checkout blocks closed shops, per-shop delivery
> fees (snapshotted onto `store_orders` at checkout, summed into the grand total),
> cart grouped by shop with per-shop delivery lines, admin dispatch audit-logs every
> rider assignment (`admin_audit_log`, best-effort/non-blocking), and a "view as store"
> filter on the Dispatch board (`?store=` query param). All 6 workspaces typecheck +
> shop/ops production builds green.
>
> **Later (larger/config, not started):** Realtime Authorization (Supabase private
> channels + RLS on `realtime.messages`), true session impersonation (vs the read-side
> store filter shipped above), customer geo/store selection, remaining refactor polish
> (promote `sonner`/`dialog` to `@grocery/ui`, `useUser` hook, `StatsCard`/`ProductCard`
> consolidation in ops, the textarea `(0,0)`-coords decision).

## Context

The platform is single-vendor today: one implicit shop, where the `stock_keeper` role
has full write on the whole catalog and read/update on all orders. The client wants to
turn the **Ops console** into a multi-tenant SaaS: a private **platform admin** onboards
**shop keepers (vendors)**, and each vendor manages **only their own** catalog, inventory
and orders — including seeing the rider assigned to their order and live tracking. Admin
stays fully separate (manage vendor profiles, create/approve/suspend accounts, oversee
everything). The customer `shop` app becomes a **blended, platform-branded catalog**:
products from all shops appear together as "our products," each tagged with its source
shop ("Sold by …").

The existing architecture is a clean seam: `profiles` (1:1 `auth.users`) + a `user_role`
enum + a `SECURITY DEFINER` `auth_role()` helper that every deny-by-default RLS policy
calls. We add a **tenant dimension** (`stores` + `store_members`), a sibling helper
`auth_store_id()`, and a **parent/child order model** so one customer checkout can span
multiple shops at scale. Web R&D (Supabase docs, Medusa/DoorDash/Shopify patterns)
confirmed shared-schema + tenant-column + RLS and the parent/child order split as the
standard, scalable approach.

### Decisions (locked with the user)

1. **Blended customer catalog.** All shops' products in one platform-branded storefront,
   each tagged with its shop. Products carry `store_id`.
2. **Parent/child orders (scale target).** One customer order (**parent**) splits into
   **one child order per shop** — each fulfilled + dispatched independently. Chosen as the
   large-scale model ("single order from multiple shops"). Built into the schema from the
   start so no later migration; the MVP customer UI may still restrict a cart to one shop
   initially and enable mixed carts later with no schema change.
3. **Central admin dispatch** for riders. Platform-wide rider pool; **admin assigns**
   `rider_id` **per child order**; vendors get a **read-only** rider view + live map.
4. **Admin approval gate** onboarding via `stores.status`
   (`invited → onboarding → active → suspended`).
5. **Billing deferred** (COD MVP) — no billing tables now.

> Hyperlocal nuance: shops are at different locations, so a multi-shop order means
> multiple deliveries (one rider + likely one delivery fee **per shop / child order**).
> The customer sees one unified order; each shop fulfills its slice.

> Scope/phasing: Phases 0–3 build + validate tenancy and the vendor/admin consoles
> (against the current shop + test stores). **Phase 4 is the customer-side multi-vendor
> go-live** (blended catalog + split checkout) — when non-default shops start receiving
> live orders.

---

## Target data model (new migrations under `supabase/migrations/`)

```sql
-- tenant
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique,
  phone text, address text,
  delivery_lat double precision, delivery_lng double precision, delivery_radius_m int,
  status text not null default 'invited'
    check (status in ('invited','onboarding','active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.store_role as enum ('owner','staff');
create table public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  store_role public.store_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_members_user_idx on public.store_members(user_id);

-- catalog gets a tenant (nullable → backfill → NOT NULL)
alter table public.products add column store_id uuid references public.stores(id) on delete cascade;
create index products_store_idx on public.products(store_id);
-- inventory inherits tenant via its product (1:1); categories stay GLOBAL.
```

**Parent/child orders.** Reshape ordering into a customer-facing parent + per-shop child.
The existing `orders` table becomes the **parent**; a new `store_orders` is the per-shop
**child** that carries the tenant, rider, status, and the fulfillment lifecycle.

```sql
-- parent: one per customer checkout
alter table public.orders
  drop column rider_id,            -- moves to child
  drop column status,              -- moves to child (parent status is derived)
  add column grand_total numeric(10,2);   -- sum of children; keep `total` or rename

-- child: one per shop within a parent order
create table public.store_orders (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  store_id     uuid not null references public.stores(id) on delete restrict,
  rider_id     uuid references public.profiles(id) on delete set null,
  status       public.order_status not null default 'placed',
  subtotal     numeric(10,2) not null check (subtotal >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index store_orders_order_idx  on public.store_orders(order_id);
create index store_orders_store_idx  on public.store_orders(store_id);
create index store_orders_rider_idx  on public.store_orders(rider_id);
create index store_orders_status_idx on public.store_orders(status);

-- line items now hang off the child (which shop fulfills them)
alter table public.order_items
  add column store_order_id uuid references public.store_orders(id) on delete cascade;
-- backfill store_order_id, then drop the old order_id FK.

-- status history + transition guard + status logging MOVE from orders → store_orders
-- (each shop advances its own child order independently).
```

Tenant + guard helpers (mirror existing `auth_role()` / `guard_profile_role`):

```sql
create or replace function public.auth_store_id()
returns uuid language sql stable security definer set search_path = public
as $$ select store_id from public.store_members where user_id = auth.uid() limit 1; $$;

-- central dispatch: only admin may set/replace a child order's rider
create or replace function public.guard_store_order_rider() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rider_id is distinct from old.rider_id and public.auth_role() <> 'admin' then
    raise exception 'Only admins may assign a rider';
  end if; return new;
end $$;
```

Move the existing `enforce_order_status_transition` + `log_order_status` triggers onto
`store_orders`.

## RLS model (new migration; extends `20260607000005_rls_policies.sql`)

Apply R&D perf rules everywhere: index the tenant column (done), wrap helper/`auth` calls
in `(select …)`, add `to authenticated`, prefer set-membership form.

- **products / inventory** — replace `*_write_ops` with `*_write_admin`
  (`auth_role()='admin'`) + `*_write_vendor` (`store_id = (select public.auth_store_id())`;
  inventory via subquery on parent product). Select stays public-read (blended catalog).
- **store_orders (the tenant-scoped order surface)** — select/update:
  `auth_role()='admin' or store_id = (select public.auth_store_id())` (vendor sees + advances
  their child), plus `rider_id = (select auth.uid())` for the assigned rider; customer reads
  their children via the parent (`exists (select 1 from orders o where o.id = order_id and
o.customer_id = (select auth.uid()))`). `guard_store_order_rider` blocks non-admin
  rider changes.
- **orders (parent)** — customer reads/inserts own; admin all; a vendor reads a parent
  only insofar as it has a child of theirs (`exists (select 1 from store_orders so where
so.order_id = orders.id and so.store_id = (select public.auth_store_id()))`).
- **order_items** — visibility follows the child `store_order` (vendor sees only items of
  their child orders; customer via parent; admin all).
- **stores / store_members** — vendor reads own; admin all/manage.
- **rider_locations** — unchanged shape; customer-visibility subquery now joins through
  `store_orders` (rider of their active child order).
- **Realtime** — vendor subscribes to `store_orders` changes; RLS auto-scopes to their
  rows. Enable Realtime Authorization (private channels + RLS on `realtime.messages`),
  client passes token via `setAuth`; also filter by `store_id` client-side.

## Application changes

**`packages/db`**

- New `queries/stores.ts`: `getStore`, `listStores` (admin), `createStore`, `updateStore`,
  `setStoreStatus`, `addStoreMember`.
- Order queries move to the parent/child shape: vendor reads **`store_orders`** (their
  children) with joined items; customer reads parent + children; `updateOrderStatus`
  targets a `store_order`; `assignRider` is **admin-only**, targets a `store_order`.
- `createProduct`/`updateProduct` stamp/validate `store_id`.
- `placeOrder` rewrite (in `apps/shop`, see below) groups cart items by `store_id`,
  creates one parent `orders` row + one `store_orders` child per shop + items per child;
  server still recomputes prices/subtotals/total from DB.

**`apps/ops`**

- `src/lib/auth.ts` `requireOpsProfile()` → also resolve caller's `store_id`.
- `src/app/(dashboard)/layout.tsx` NAV: vendor sees Dashboard/Orders/Catalog/Store-settings;
  admin adds **Vendors**, **Rider dispatch**, Accounts, Settings.
- Vendor surfaces (reuse existing components, store-scoped to their `store_orders`):
  `orders-board.tsx` (their child orders; advance status; **read-only** assigned rider +
  live map), `catalog-grid.tsx` + `product-form-sheet.tsx` (their products), new **Store
  settings** page.
- Admin surfaces: new **Vendors** section (`stores` list; create + invite owner; edit;
  **approve/suspend** via `status`; per-vendor metrics); **Rider dispatch** (assign
  `rider_id` on `store_orders` across shops) on the existing rider map; optional
  **"view as vendor"** impersonation (admin-only, **audited**).
- Onboarding: extend the admin service-role path (there's a stubbed "Invite rider" button
  in `accounts/page.tsx` + edge-function pattern in `supabase/functions/on-order-assigned`):
  a Server Action / Edge Function via `@grocery/db/admin` (`client.admin.ts`) →
  `inviteUserByEmail`, create store, set `profiles.role='stock_keeper'`, insert
  `store_members(owner)`. Owner sets password → store-profile wizard → admin approves →
  `status='active'`.

**`apps/shop`**

- `catalog-browser.tsx` / `product-card.tsx`: surface **"Sold by <Shop>"** on products
  (products now carry `store_id`; join store name).
- `cart/actions.ts` `placeOrder()`: build the parent + per-shop child orders (above).
- `order-tracker.tsx` / `orders` pages: show a parent order with **per-shop child**
  statuses + each child's rider/live map.
- Cart (`cart-context`, `cart-view`, `cart-drawer`): MVP may keep a cart to one shop
  (prompt to switch), or group by shop; mixed-cart checkout already supported by the
  schema when enabled.

## Phased roadmap (each independently shippable)

- **Phase 0 — backend foundations:** `stores`/`store_members`; `products.store_id`;
  **parent/child order tables** (`store_orders`, move `rider_id`/`status`/history/guards
  off `orders`); `auth_store_id()` + `guard_store_order_rider()`. **Backfill:** a "Default
  Store" = today's shop; one `store_orders` child per existing order; set `store_id` on
  products; add current stock_keeper(s) as `owner`; set columns `NOT NULL`. Ship RLS deltas.
- **Phase 1 — vendor scoping in Ops:** store-scope `packages/db` + Ops to `store_orders`;
  vendor sees only their children; read-only rider view; verify with a 2nd test store.
- **Phase 2 — admin vendor mgmt + onboarding + rider dispatch:** Vendors section,
  invite/approve/suspend, wizard, service-role invite action; central dispatch UI.
- **Phase 3 — realtime authorization + polish:** private channels/RLS, per-store
  open/closed, "view as vendor" + audit log.
- **Phase 4 — customer multi-vendor go-live:** blended catalog with "Sold by" tags,
  parent/child order tracking, and (optionally) mixed-shop cart/checkout.

## Critical files

- New migrations: `supabase/migrations/2026…_stores_and_members.sql`,
  `…_parent_child_orders.sql`, `…_tenant_backfill.sql`, `…_tenant_rls.sql`.
- `packages/db/src/queries/{stores.ts (new),catalog.ts,orders.ts,profiles.ts,index.ts}`,
  `packages/db/src/client.admin.ts`, `packages/db/src/types.gen.ts` (regen via `pnpm db:types`).
- `packages/shared/src/orderStatus.ts` / `constants.ts` (status now per child order; store-role consts).
- `apps/ops/src/lib/auth.ts`, `apps/ops/src/app/(dashboard)/layout.tsx`,
  `apps/ops/src/components/{orders-board,catalog-grid,product-form-sheet,accounts-table,sidebar}.tsx`,
  `apps/ops/src/app/(dashboard)/accounts/page.tsx`, new `…/vendors/*`, `…/dispatch/*`,
  store-settings route + invite Server Action.
- `apps/shop/src/app/cart/actions.ts`,
  `apps/shop/src/components/{catalog-browser,product-card,order-tracker,cart-view,cart-drawer}.tsx`.

## Verification

- **RLS isolation (most important):** two stores (A, B) each with an owner, products, and
  child orders. As A's owner (scoped session), confirm reads return only A's products +
  `store_orders`, and writing B's rows is denied; repeat for B. Confirm a vendor cannot set
  `rider_id` (guard raises) but admin can; confirm each shop advances only its own child
  status. `supabase db lint` + a SQL test script + driving the Ops UI per role.
- **Order split:** a cart with items from A and B produces one parent `orders` row + two
  `store_orders` children with correct subtotals; server-recomputed total = sum; each
  shop sees only its child; admin dispatches a rider per child.
- **Onboarding:** admin invites → email → set password → wizard → approve → `active`;
  suspend blocks vendor writes.
- **Realtime:** status change on A's child pushes live only to A (+ admin), not B.
- **Regression:** existing single-shop customer→rider→ops flow still works after backfill.
- `pnpm typecheck` + `pnpm db:types` green after migrations.

## Out of scope (this effort)

SaaS billing/Stripe, automated rider assignment, per-store categories, and (until Phase 4)
the customer-side mixed-shop cart UI. Schema is designed so billing (a `vendor_billing`/
subscriptions concern) attaches later without a rewrite.
