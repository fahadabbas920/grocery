-- Multi-tenant SaaS, Phase 2/3 additions:
--   • stores.is_open        — vendor open/closed toggle (block checkout when closed)
--   • stores.delivery_fee   — per-shop delivery fee (charged per child order)
--   • store_orders.delivery_fee — fee snapshot at checkout time
--   • admin_audit_log       — record of privileged admin actions (dispatch, view-as, etc.)

alter table public.stores
  add column is_open boolean not null default true,
  add column delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0);

alter table public.store_orders
  add column delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0);

-- ── admin audit log ──────────────────────────────────────────────────────────

create table public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

-- Admins read the log; admins write their own entries (actor = self). No updates/deletes.
create policy "admin_audit_select" on public.admin_audit_log
  for select to authenticated using ((select public.auth_role()) = 'admin');

create policy "admin_audit_insert" on public.admin_audit_log
  for insert to authenticated
  with check ((select public.auth_role()) = 'admin' and actor_id = (select auth.uid()));
