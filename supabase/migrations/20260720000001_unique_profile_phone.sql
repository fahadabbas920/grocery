-- Phone numbers double as login identifiers (via synthetic email in app code),
-- so two profiles can't share one.
create unique index profiles_phone_key on public.profiles (phone) where phone is not null;
