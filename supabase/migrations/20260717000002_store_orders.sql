-- Multi-tenant SaaS, Phase 0 (2/4): parent/child orders.
-- `orders` becomes the customer-facing PARENT (one per checkout). `store_orders` is the
-- per-shop CHILD that carries the tenant, assigned rider, status, and fulfillment
-- lifecycle. A customer order may span multiple shops → one child per shop.
-- This migration is additive; the cutover (drop parent status/rider, move triggers,
-- rewrite RLS) happens in migration 4 after the backfill in migration 3.

create table public.store_orders (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  store_id    uuid not null references public.stores (id) on delete restrict,
  rider_id    uuid references public.profiles (id) on delete set null,
  status      public.order_status not null default 'placed',
  subtotal    numeric(10, 2) not null check (subtotal >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (order_id, store_id)
);
create index store_orders_order_idx  on public.store_orders (order_id);
create index store_orders_store_idx  on public.store_orders (store_id);
create index store_orders_rider_idx  on public.store_orders (rider_id);
create index store_orders_status_idx on public.store_orders (status);

create trigger store_orders_touch_updated_at
  before update on public.store_orders
  for each row execute function public.touch_updated_at();

-- Central dispatch: only admins may set/replace a child order's rider. Vendors and riders
-- may change status but not reassign. Mirrors guard_profile_role.
create or replace function public.guard_store_order_rider()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rider_id is distinct from old.rider_id and public.auth_role() <> 'admin' then
    raise exception 'Only admins may assign a rider';
  end if;
  return new;
end;
$$;

create trigger store_orders_guard_rider
  before update on public.store_orders
  for each row execute function public.guard_store_order_rider();

-- Re-point line items and status history from the parent order to the per-shop child.
-- Columns are nullable now; backfilled in migration 3, made NOT NULL + old FK dropped in
-- migration 4.
alter table public.order_items
  add column store_order_id uuid references public.store_orders (id) on delete cascade;
create index order_items_store_order_idx on public.order_items (store_order_id);

alter table public.order_status_history
  add column store_order_id uuid references public.store_orders (id) on delete cascade;
create index order_status_history_store_order_idx
  on public.order_status_history (store_order_id);

alter table public.store_orders enable row level security;
