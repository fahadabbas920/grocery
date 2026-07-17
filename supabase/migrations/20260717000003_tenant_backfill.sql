-- Multi-tenant SaaS, Phase 0 (3/4): backfill the existing single shop as the "Default
-- Store", split every existing order into a per-shop child, and enroll current stock
-- keepers as its owners. Runs before the cutover (migration 4) so column drops / NOT NULL
-- constraints apply to already-populated data. Idempotent-ish: safe on an empty DB.

do $$
declare
  v_store_id uuid;
begin
  -- 1. The one existing shop becomes the default (live) store.
  insert into public.stores (name, slug, status)
  values ('Default Store', 'default-store', 'active')
  returning id into v_store_id;

  -- 2. All existing products belong to it.
  update public.products set store_id = v_store_id where store_id is null;

  -- 3. One child store_order per existing (single-shop) order, copying rider/status/total.
  --    No transition/log triggers on store_orders yet (added in migration 4), so arbitrary
  --    starting statuses insert cleanly.
  insert into public.store_orders (order_id, store_id, rider_id, status, subtotal, created_at, updated_at)
  select o.id, v_store_id, o.rider_id, o.status, o.total, o.created_at, o.updated_at
  from public.orders o;

  -- 4. Point line items at their order's child.
  update public.order_items oi
  set store_order_id = so.id
  from public.store_orders so
  where so.order_id = oi.order_id and oi.store_order_id is null;

  -- 5. Point status history at the child.
  update public.order_status_history h
  set store_order_id = so.id
  from public.store_orders so
  where so.order_id = h.order_id and h.store_order_id is null;

  -- 6. Current stock keepers become owners of the default store.
  insert into public.store_members (store_id, user_id, store_role)
  select v_store_id, p.id, 'owner'
  from public.profiles p
  where p.role = 'stock_keeper'
  on conflict do nothing;
end $$;

-- Lock the tenant columns now that every row is populated.
alter table public.products             alter column store_id       set not null;
alter table public.order_items          alter column store_order_id set not null;
alter table public.order_status_history alter column store_order_id set not null;
