-- Phone signups (via the phone-signup Edge Function) are auto-confirmed
-- without an SMS OTP step. This flag distinguishes those from a real,
-- future phone verification so ops/UI can show it as unverified.
alter table public.profiles add column phone_verified boolean not null default false;
