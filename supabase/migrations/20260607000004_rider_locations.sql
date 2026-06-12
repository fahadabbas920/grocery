-- Live rider GPS. One row per rider, upserted from the rider app on a throttle.

create table public.rider_locations (
  rider_id    uuid primary key references public.profiles (id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  updated_at  timestamptz not null default now()
);

create trigger rider_locations_touch_updated_at
  before update on public.rider_locations
  for each row execute function public.touch_updated_at();

alter table public.rider_locations enable row level security;
