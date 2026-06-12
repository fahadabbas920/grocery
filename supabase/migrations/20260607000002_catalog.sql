-- Catalog: categories, products, inventory.

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  category_id  uuid not null references public.categories (id) on delete restrict,
  price        numeric(10, 2) not null check (price >= 0),
  image_path   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);

-- One inventory row per product (1:1). Created alongside the product.
create table public.inventory (
  product_id       uuid primary key references public.products (id) on delete cascade,
  quantity         int not null default 0 check (quantity >= 0),
  is_out_of_stock  boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- Generic updated_at touch trigger, reused across tables.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

create trigger inventory_touch_updated_at
  before update on public.inventory
  for each row execute function public.touch_updated_at();

-- Auto-create an inventory row when a product is added.
create or replace function public.handle_new_product()
returns trigger
language plpgsql
as $$
begin
  insert into public.inventory (product_id) values (new.id);
  return new;
end;
$$;

create trigger on_product_created
  after insert on public.products
  for each row execute function public.handle_new_product();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
