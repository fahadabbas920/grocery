-- Runtime map-provider config, stored in `app_settings` so it can be rotated
-- from the ops Settings page without a redeploy. Only the RENDERING token goes
-- here (safe to expose client-side, domain-restricted at the provider). Real
-- secret keys used for server-side geocoding live only as Edge Function
-- secrets (`supabase secrets set ...`), never in this table.

insert into public.app_settings (key, value)
values
  ('maps_provider', '"none"'::jsonb),
  ('maps_public_token', 'null'::jsonb)
on conflict (key) do nothing;
