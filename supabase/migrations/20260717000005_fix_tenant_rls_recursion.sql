-- Multi-tenant SaaS, Phase 0 (fix): break RLS policy recursion.
-- The tenant policies from migration 4 cross-reference each other's tables
-- (orders ↔ store_orders, and profiles/order_items/history/rider_locations → both),
-- which Postgres rejects with "infinite recursion detected in policy". Move every
-- cross-table ownership check into SECURITY DEFINER helpers (which bypass RLS on their
-- internal reads — the same technique as auth_role()/auth_store_id()), then rewrite the
-- affected policies to call them. Behavior is identical; the recursion is gone.

-- ── helpers (SECURITY DEFINER → no RLS recursion on internal reads) ──────────────

create or replace function public.owns_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders where id = p_order_id and customer_id = auth.uid());
$$;

create or replace function public.store_has_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.store_orders
    where order_id = p_order_id and store_id = public.auth_store_id()
  );
$$;

create or replace function public.owns_store_order_parent(p_store_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.store_orders so
    join public.orders o on o.id = so.order_id
    where so.id = p_store_order_id and o.customer_id = auth.uid()
  );
$$;

create or replace function public.can_access_store_order(p_store_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.store_orders so
    where so.id = p_store_order_id and (
      public.auth_role() = 'admin'
      or so.store_id = public.auth_store_id()
      or so.rider_id = auth.uid()
      or exists (select 1 from public.orders o where o.id = so.order_id and o.customer_id = auth.uid())
    )
  );
$$;

create or replace function public.rider_serves_customer(p_rider_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.store_orders so
    join public.orders o on o.id = so.order_id
    where so.rider_id = p_rider_id and o.customer_id = auth.uid()
      and so.status in ('preparing', 'on_the_way')
  );
$$;

create or replace function public.is_my_rider(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.store_orders so
    join public.orders o on o.id = so.order_id
    where so.rider_id = p_profile_id and o.customer_id = auth.uid()
  );
$$;

-- ── profiles ─────────────────────────────────────────────────────────────────

drop policy if exists "profiles_select_assigned_rider" on public.profiles;
create policy "profiles_select_assigned_rider" on public.profiles
  for select to authenticated using (public.is_my_rider(id));

-- ── orders (parent) ──────────────────────────────────────────────────────────

drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select to authenticated using (
    customer_id = (select auth.uid())
    or (select public.auth_role()) = 'admin'
    or public.store_has_order(id)
  );

-- ── store_orders (child) ─────────────────────────────────────────────────────

drop policy if exists "store_orders_select" on public.store_orders;
create policy "store_orders_select" on public.store_orders
  for select to authenticated using (
    (select public.auth_role()) = 'admin'
    or store_id = (select public.auth_store_id())
    or rider_id = (select auth.uid())
    or public.owns_order(order_id)
  );

drop policy if exists "store_orders_insert_customer" on public.store_orders;
create policy "store_orders_insert_customer" on public.store_orders
  for insert to authenticated with check (status = 'placed' and public.owns_order(order_id));

-- ── order_items ──────────────────────────────────────────────────────────────

drop policy if exists "order_items_select" on public.order_items;
create policy "order_items_select" on public.order_items
  for select to authenticated using (public.can_access_store_order(store_order_id));

drop policy if exists "order_items_insert_customer" on public.order_items;
create policy "order_items_insert_customer" on public.order_items
  for insert to authenticated with check (public.owns_store_order_parent(store_order_id));

-- ── order_status_history ─────────────────────────────────────────────────────

drop policy if exists "order_status_history_select" on public.order_status_history;
create policy "order_status_history_select" on public.order_status_history
  for select to authenticated using (public.can_access_store_order(store_order_id));

-- ── rider_locations ──────────────────────────────────────────────────────────

drop policy if exists "rider_locations_select_customer" on public.rider_locations;
create policy "rider_locations_select_customer" on public.rider_locations
  for select to authenticated using (public.rider_serves_customer(rider_id));
