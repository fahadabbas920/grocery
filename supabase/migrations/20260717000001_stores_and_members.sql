-- Multi-tenant SaaS, Phase 0 (1/4): tenant entity + membership + tenant helper.
-- A "store" is a vendor/tenant. Shop keepers (stock_keeper role) operate one store via
-- store_members. Admin stays global. Mirrors the existing auth_role()/guard_profile_role
-- patterns (see 20260607000001 / 20260607000005).

create table public.stores (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text unique,
  phone             text,
  address           text,
  delivery_lat      double precision,
  delivery_lng      double precision,
  delivery_radius_m int,
  -- onboarding lifecycle; admin-approval gated (see guard_store_status).
  status            text not null default 'invited'
    check (status in ('invited', 'onboarding', 'active', 'suspended')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger stores_touch_updated_at
  before update on public.stores
  for each row execute function public.touch_updated_at();

create type public.store_role as enum ('owner', 'staff');

create table public.store_members (
  store_id    uuid not null references public.stores (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  store_role  public.store_role not null default 'owner',
  created_at  timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index store_members_user_idx on public.store_members (user_id);

-- Caller's store id (null for admin/customer/rider). SECURITY DEFINER avoids recursive
-- RLS on store_members, exactly like auth_role() on profiles.
create or replace function public.auth_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from public.store_members where user_id = auth.uid() limit 1;
$$;

-- Only admins may change a store's lifecycle status (approve/suspend). Vendors may edit
-- their own store profile but not flip themselves live. Mirrors guard_profile_role.
create or replace function public.guard_store_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and public.auth_role() <> 'admin' then
    raise exception 'Only admins may change a store status';
  end if;
  return new;
end;
$$;

create trigger stores_guard_status
  before update on public.stores
  for each row execute function public.guard_store_status();

-- Tenant column on catalog (nullable now; backfilled + set NOT NULL in migration 3).
alter table public.products
  add column store_id uuid references public.stores (id) on delete cascade;
create index products_store_idx on public.products (store_id);

-- ============================== RLS: stores ==============================

alter table public.stores enable row level security;

-- Store info (name for "Sold by <Shop>" tags, address/service area) is public marketplace
-- data, mirroring the public catalog.
create policy "stores_select_all" on public.stores
  for select using (true);

-- Admins manage any store (create/approve/suspend/edit).
create policy "stores_write_admin" on public.stores
  for all to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');

-- A vendor may edit their own store profile (status change blocked by guard_store_status).
create policy "stores_update_own" on public.stores
  for update to authenticated
  using (id = (select public.auth_store_id()))
  with check (id = (select public.auth_store_id()));

-- ============================== RLS: store_members ==============================

alter table public.store_members enable row level security;

-- See your own membership; admins see all.
create policy "store_members_select_own" on public.store_members
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.auth_role()) = 'admin');

-- Admins manage membership (onboarding sets the owner). Vendor-managed staff is a later phase.
create policy "store_members_write_admin" on public.store_members
  for all to authenticated
  using ((select public.auth_role()) = 'admin')
  with check ((select public.auth_role()) = 'admin');
