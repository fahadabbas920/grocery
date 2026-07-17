-- Multi-tenant SaaS, Phase 0 (4/4): cutover.
-- Move the status lifecycle (transition guard + history logging) from the parent `orders`
-- onto the per-shop child `store_orders`; drop the parent's status/rider columns and the
-- now-redundant order_id links; and rewrite RLS for tenant isolation. Runs after the
-- backfill (migration 3) so all children/items/history already exist.

-- ============================== 1. drop policies referencing soon-dropped columns ======

drop policy if exists "profiles_select_assigned_rider" on public.profiles;  -- refs orders.rider_id
drop policy if exists "orders_select_own"        on public.orders;
drop policy if exists "orders_insert_own"        on public.orders;
drop policy if exists "orders_update_ops"        on public.orders;
drop policy if exists "orders_update_rider"      on public.orders;
drop policy if exists "order_items_select"       on public.order_items;
drop policy if exists "order_items_insert_own"   on public.order_items;
drop policy if exists "order_status_history_select" on public.order_status_history;
drop policy if exists "rider_locations_select_customer" on public.rider_locations;
drop policy if exists "products_write_ops"       on public.products;
drop policy if exists "inventory_write_ops"      on public.inventory;
drop policy if exists "categories_write_ops"     on public.categories;

-- ============================== 2. move status triggers → store_orders ================

drop trigger if exists orders_enforce_status_transition on public.orders;
drop trigger if exists orders_log_status_insert on public.orders;
drop trigger if exists orders_log_status_update on public.orders;

-- Log into history keyed on the child store_order (new.id). SECURITY DEFINER (inserts are
-- trigger-only; no direct insert policy on the history table).
create or replace function public.log_order_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (store_order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

-- enforce_order_status_transition() is generic over NEW/OLD.status — reuse on the child.
create trigger store_orders_enforce_status_transition
  before update of status on public.store_orders
  for each row execute function public.enforce_order_status_transition();

create trigger store_orders_log_status_insert
  after insert on public.store_orders
  for each row execute function public.log_order_status();

create trigger store_orders_log_status_update
  after update of status on public.store_orders
  for each row execute function public.log_order_status();

-- ============================== 3. drop redundant columns ============================

alter table public.orders drop column rider_id;   -- moved to store_orders
alter table public.orders drop column status;      -- moved to store_orders (parent status derived)

alter table public.order_items          drop column order_id;  -- reachable via store_order.order_id
alter table public.order_status_history drop column order_id;  -- keyed on store_order_id now

-- ============================== 3b. RLS: profiles (assigned rider via child) ========

-- A customer may read the profile of the rider assigned to one of their orders — now
-- resolved through the per-shop child. (Replaces the version that referenced orders.rider_id.)
create policy "profiles_select_assigned_rider" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.store_orders so
      join public.orders o on o.id = so.order_id
      where so.rider_id = profiles.id and o.customer_id = (select auth.uid())
    )
  );

-- ============================== 4. RLS: parent orders ================================

-- Customer reads own; admin all; a vendor sees a parent only if it has a child of theirs.
create policy "orders_select" on public.orders
  for select to authenticated using (
    customer_id = (select auth.uid())
    or (select public.auth_role()) = 'admin'
    or exists (
      select 1 from public.store_orders so
      where so.order_id = orders.id and so.store_id = (select public.auth_store_id())
    )
  );

create policy "orders_insert_own" on public.orders
  for insert to authenticated with check (customer_id = (select auth.uid()));

create policy "orders_update_admin" on public.orders
  for update to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');

-- ============================== 5. RLS: store_orders (tenant order surface) ==========

-- Admin all; vendor own store; assigned rider; customer via their parent.
create policy "store_orders_select" on public.store_orders
  for select to authenticated using (
    (select public.auth_role()) = 'admin'
    or store_id = (select public.auth_store_id())
    or rider_id = (select auth.uid())
    or exists (
      select 1 from public.orders o
      where o.id = store_orders.order_id and o.customer_id = (select auth.uid())
    )
  );

-- Customer creates children for their own freshly-placed parent (must start 'placed').
create policy "store_orders_insert_customer" on public.store_orders
  for insert to authenticated with check (
    status = 'placed'
    and exists (
      select 1 from public.orders o
      where o.id = store_orders.order_id and o.customer_id = (select auth.uid())
    )
  );

-- Admin updates anything (incl. central rider dispatch). Vendor + assigned rider advance
-- status; guard_store_order_rider blocks non-admins from changing rider_id.
create policy "store_orders_update_admin" on public.store_orders
  for update to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');

create policy "store_orders_update_vendor" on public.store_orders
  for update to authenticated
  using (store_id = (select public.auth_store_id()))
  with check (store_id = (select public.auth_store_id()));

create policy "store_orders_update_rider" on public.store_orders
  for update to authenticated
  using (rider_id = (select auth.uid()))
  with check (rider_id = (select auth.uid()));

-- ============================== 6. RLS: order_items (via child) ======================

create policy "order_items_select" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.store_orders so
      where so.id = order_items.store_order_id
        and (
          (select public.auth_role()) = 'admin'
          or so.store_id = (select public.auth_store_id())
          or so.rider_id = (select auth.uid())
          or exists (
            select 1 from public.orders o
            where o.id = so.order_id and o.customer_id = (select auth.uid())
          )
        )
    )
  );

create policy "order_items_insert_customer" on public.order_items
  for insert to authenticated with check (
    exists (
      select 1 from public.store_orders so
      join public.orders o on o.id = so.order_id
      where so.id = order_items.store_order_id and o.customer_id = (select auth.uid())
    )
  );

-- ============================== 7. RLS: order_status_history (via child) =============

create policy "order_status_history_select" on public.order_status_history
  for select to authenticated using (
    exists (
      select 1 from public.store_orders so
      where so.id = order_status_history.store_order_id
        and (
          (select public.auth_role()) = 'admin'
          or so.store_id = (select public.auth_store_id())
          or so.rider_id = (select auth.uid())
          or exists (
            select 1 from public.orders o
            where o.id = so.order_id and o.customer_id = (select auth.uid())
          )
        )
    )
  );
-- Inserts via the SECURITY DEFINER trigger only.

-- ============================== 8. RLS: rider_locations (via child) ==================

create policy "rider_locations_select_customer" on public.rider_locations
  for select to authenticated using (
    exists (
      select 1 from public.store_orders so
      join public.orders o on o.id = so.order_id
      where so.rider_id = rider_locations.rider_id
        and o.customer_id = (select auth.uid())
        and so.status in ('preparing', 'on_the_way')
    )
  );

-- ============================== 9. RLS: catalog writes (admin + vendor) ==============

create policy "products_write_admin" on public.products
  for all to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');

create policy "products_write_vendor" on public.products
  for all to authenticated
  using (store_id = (select public.auth_store_id()))
  with check (store_id = (select public.auth_store_id()));

create policy "inventory_write_admin" on public.inventory
  for all to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');

create policy "inventory_write_vendor" on public.inventory
  for all to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = inventory.product_id and p.store_id = (select public.auth_store_id())
  ))
  with check (exists (
    select 1 from public.products p
    where p.id = inventory.product_id and p.store_id = (select public.auth_store_id())
  ));

-- Global taxonomy is admin-managed only (vendors pick from it).
create policy "categories_write_admin" on public.categories
  for all to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');

-- ============================== 10. realtime ========================================

alter publication supabase_realtime add table public.store_orders;
alter table public.store_orders replica identity full;
