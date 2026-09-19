-- Automatic stock decrement/restock. Enforced in the DB (not app code) so it's
-- atomic under concurrent orders — two customers racing for the last unit can't
-- both succeed. is_out_of_stock is derived from quantity on every order-driven
-- change (any prior manual override is superseded at that point).

create or replace function public.decrement_inventory_on_order_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  available int;
  remaining int;
begin
  select quantity into available
  from public.inventory
  where product_id = new.product_id
  for update;

  if available is null then
    raise exception 'No inventory row for product %', new.product_id;
  end if;
  if available < new.quantity then
    raise exception 'Insufficient stock for product %: have %, need %',
      new.product_id, available, new.quantity;
  end if;

  remaining := available - new.quantity;
  update public.inventory
  set quantity = remaining, is_out_of_stock = (remaining <= 0)
  where product_id = new.product_id;

  return new;
end;
$$;

create trigger order_items_decrement_inventory
  after insert on public.order_items
  for each row execute function public.decrement_inventory_on_order_item();

-- Cancellation is the only reversal event in the order lifecycle (see
-- packages/shared/orderStatus.ts ORDER_STATUS_TRANSITIONS) — restock on it.
create or replace function public.restock_on_order_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.inventory inv
    set quantity = inv.quantity + oi.quantity,
        is_out_of_stock = (inv.quantity + oi.quantity) <= 0
    from public.order_items oi
    where oi.store_order_id = new.id
      and inv.product_id = oi.product_id;
  end if;
  return new;
end;
$$;

create trigger store_orders_restock_on_cancel
  after update of status on public.store_orders
  for each row execute function public.restock_on_order_cancelled();
