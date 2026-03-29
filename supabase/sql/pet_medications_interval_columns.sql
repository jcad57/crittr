-- Idempotent: safe to run in Supabase SQL Editor if migrations are not applied.
-- Adds custom interval fields for pet_medications (see migrations/013_pet_medications_custom_interval.sql).

alter table public.pet_medications
  add column if not exists interval_count integer,
  add column if not exists interval_unit text;

comment on column public.pet_medications.interval_count is
  'For custom schedules: N in "every N days/weeks/months" (e.g. 3 for every 3 months)';
comment on column public.pet_medications.interval_unit is
  'day | week | month — unit for interval_count';
