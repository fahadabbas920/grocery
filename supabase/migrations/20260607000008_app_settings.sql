-- Runtime feature flags / app settings (key → JSON value), admin-controlled.
-- Used for toggles like Google Maps that should change without a redeploy.

create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create trigger app_settings_touch_updated_at
  before update on public.app_settings
  for each row execute function public.touch_updated_at();

alter table public.app_settings enable row level security;

-- Any authenticated user may read settings (apps gate features on them).
create policy "app_settings_select_all" on public.app_settings
  for select using (auth.role() = 'authenticated');

-- Only admins may change settings.
create policy "app_settings_write_admin" on public.app_settings
  for all using (public.auth_role() = 'admin')
  with check (public.auth_role() = 'admin');

-- Default: Maps OFF until a Google Maps API key is configured.
insert into public.app_settings (key, value)
values ('maps_enabled', 'false'::jsonb)
on conflict (key) do nothing;
