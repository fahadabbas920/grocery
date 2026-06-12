-- Orders, line items, status history, and the status-transition guard.

create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.profiles (id) on delete restrict,
  rider_id      uuid references public.profiles (id) on delete set null,
  status        public.order_status not null default 'placed',
  total         numeric(10, 2) not null check (total >= 0),
  address       text not null,
  delivery_lat  double precision not null,
  delivery_lng  double precision not null,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_rider_idx on public.orders (rider_id);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  quantity    int not null check (quantity > 0),
  unit_price  numeric(10, 2) not null check (unit_price >= 0)
);
create index order_items_order_idx on public.order_items (order_id);

-- Append-only audit of every status change.
create table public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id);

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- Guard: enforce the allowed status transitions (mirror of
-- packages/shared/orderStatus.ts ORDER_STATUS_TRANSITIONS) and log each change.
create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
as $$
declare
  allowed public.order_status[];
begin
  if new.status = old.status then
    return new;
  end if;

  allowed := case old.status
    when 'placed'     then array['preparing', 'cancelled']::public.order_status[]
    when 'preparing'  then array['on_the_way', 'cancelled']::public.order_status[]
    when 'on_the_way' then array['delivered', 'cancelled']::public.order_status[]
    else array[]::public.order_status[]
  end;

  if not (new.status = any (allowed)) then
    raise exception 'Illegal order status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger orders_enforce_status_transition
  before update of status on public.orders
  for each row execute function public.enforce_order_status_transition();

-- Record initial and subsequent status into history.
create or replace function public.log_order_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_log_status_insert
  after insert on public.orders
  for each row execute function public.log_order_status();

create trigger orders_log_status_update
  after update of status on public.orders
  for each row execute function public.log_order_status();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
