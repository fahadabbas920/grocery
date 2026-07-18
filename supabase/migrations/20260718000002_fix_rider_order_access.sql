-- Fix: riders cannot read the parent order for their assigned store_orders.
-- The `orders_select` policy (migration 4, rewritten in migration 5) covers
-- customer/admin/vendor only — no clause for the assigned rider. Since
-- packages/db/src/queries/riders.ts joins `orders` off `store_orders` for the
-- rider app's order-detail screen, the rider's embedded `order:orders(...)`
-- resolves to null under RLS, silently blanking the delivery address and
-- coordinates (rider app then falls back to "(0,0)" for the map deep link).

create or replace function public.rider_has_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.store_orders
    where order_id = p_order_id and rider_id = auth.uid()
  );
$$;

drop policy if exists "orders_select" on public.orders;
create policy "orders_select" on public.orders
  for select to authenticated using (
    customer_id = (select auth.uid())
    or (select public.auth_role()) = 'admin'
    or public.store_has_order(id)
    or public.rider_has_order(id)
  );
