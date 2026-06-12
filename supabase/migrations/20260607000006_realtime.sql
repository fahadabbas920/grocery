-- Enable Realtime broadcast on the tables the apps subscribe to.
-- RLS still governs which rows each subscriber receives.

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;
alter publication supabase_realtime add table public.rider_locations;

-- Ensure UPDATE/DELETE payloads include the full row (needed for status diffs).
alter table public.orders replica identity full;
alter table public.rider_locations replica identity full;
