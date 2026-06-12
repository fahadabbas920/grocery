-- Foundation: enums, profiles, role helper, and auto-provision trigger.
-- Mirrors packages/shared (USER_ROLES, ORDER_STATUSES). Keep in sync.

create type public.user_role as enum ('customer', 'stock_keeper', 'rider', 'admin');
create type public.order_status as enum ('placed', 'preparing', 'on_the_way', 'delivered', 'cancelled');

-- One profile row per auth user. role defaults to 'customer'; staff/riders are
-- elevated by an admin (or seeded).
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'customer',
  full_name   text not null default '',
  phone       text,
  created_at  timestamptz not null default now()
);

-- SECURITY DEFINER helper to read the caller's role inside RLS policies without
-- recursive policy evaluation on `profiles`.
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Auto-create a profile when a new auth user signs up. full_name/phone are pulled
-- from signup metadata when present.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
