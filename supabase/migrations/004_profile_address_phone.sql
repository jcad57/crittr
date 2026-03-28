-- Add home address and phone to user profiles (onboarding / contact).
-- display_name remains on the table for legacy data but is no longer collected in onboarding.

alter table public.profiles
  add column if not exists home_address text;

alter table public.profiles
  add column if not exists phone_number text;
