-- Row Level Security policies. Deny-by-default: RLS is enabled on every table and
-- access is granted only through the policies below. auth_role() reads the caller's
-- role (SECURITY DEFINER, defined in the init migration).

-- ============================== profiles ==============================

-- Read your own profile.
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

-- Ops staff read all profiles (account management, assignment dropdowns).
create policy "profiles_select_ops" on public.profiles
  for select using (public.auth_role() in ('admin', 'stock_keeper'));

-- A customer may read the rider profile assigned to one of their orders (for tracking).
create policy "profiles_select_assigned_rider" on public.profiles
  for select using (
    exists (
      select 1 from public.orders o
      where o.rider_id = profiles.id and o.customer_id = auth.uid()
    )
  );

-- Update your own profile (role changes are blocked by trigger below).
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Admins manage any profile (including role elevation).
create policy "profiles_update_admin" on public.profiles
  for update using (public.auth_role() = 'admin') with check (public.auth_role() = 'admin');

-- Prevent privilege escalation: only admins may change the role column.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and public.auth_role() <> 'admin' then
    raise exception 'Only admins may change a profile role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ============================== categories ==============================

-- Catalog is public-readable by any authenticated user.
create policy "categories_select_all" on public.categories
  for select using (auth.role() = 'authenticated');

create policy "categories_write_ops" on public.categories
  for all using (public.auth_role() in ('admin', 'stock_keeper'))
  with check (public.auth_role() in ('admin', 'stock_keeper'));

-- ============================== products ==============================

create policy "products_select_all" on public.products
  for select using (auth.role() = 'authenticated');

create policy "products_write_ops" on public.products
  for all using (public.auth_role() in ('admin', 'stock_keeper'))
  with check (public.auth_role() in ('admin', 'stock_keeper'));

-- ============================== inventory ==============================

create policy "inventory_select_all" on public.inventory
  for select using (auth.role() = 'authenticated');

create policy "inventory_write_ops" on public.inventory
  for all using (public.auth_role() in ('admin', 'stock_keeper'))
  with check (public.auth_role() in ('admin', 'stock_keeper'));

-- ============================== orders ==============================

-- Customers see their own orders; riders see assigned; ops see all.
create policy "orders_select_own" on public.orders
  for select using (
    customer_id = auth.uid()
    or rider_id = auth.uid()
    or public.auth_role() in ('admin', 'stock_keeper')
  );

-- Customers place their own orders (status defaults to 'placed').
create policy "orders_insert_own" on public.orders
  for insert with check (customer_id = auth.uid());

-- Ops update any order (assignment, status). The transition guard enforces legality.
create policy "orders_update_ops" on public.orders
  for update using (public.auth_role() in ('admin', 'stock_keeper'))
  with check (public.auth_role() in ('admin', 'stock_keeper'));

-- The assigned rider may advance their own order (e.g. on_the_way -> delivered).
create policy "orders_update_rider" on public.orders
  for update using (rider_id = auth.uid()) with check (rider_id = auth.uid());

-- ============================== order_items ==============================

-- Read items for any order you can read (mirrors orders visibility).
create policy "order_items_select" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (
          o.customer_id = auth.uid()
          or o.rider_id = auth.uid()
          or public.auth_role() in ('admin', 'stock_keeper')
        )
    )
  );

-- A customer inserts items for their own freshly-placed order.
create policy "order_items_insert_own" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

-- ============================== order_status_history ==============================

create policy "order_status_history_select" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (
          o.customer_id = auth.uid()
          or o.rider_id = auth.uid()
          or public.auth_role() in ('admin', 'stock_keeper')
        )
    )
  );
-- Inserts happen via SECURITY DEFINER trigger only — no direct insert policy.

-- ============================== rider_locations ==============================

-- A rider upserts only their own location.
create policy "rider_locations_upsert_own" on public.rider_locations
  for all using (rider_id = auth.uid()) with check (rider_id = auth.uid());

-- Ops see all rider locations (live map).
create policy "rider_locations_select_ops" on public.rider_locations
  for select using (public.auth_role() in ('admin', 'stock_keeper'));

-- A customer sees the location of the rider assigned to their active order.
create policy "rider_locations_select_customer" on public.rider_locations
  for select using (
    exists (
      select 1 from public.orders o
      where o.rider_id = rider_locations.rider_id
        and o.customer_id = auth.uid()
        and o.status in ('preparing', 'on_the_way')
    )
  );
