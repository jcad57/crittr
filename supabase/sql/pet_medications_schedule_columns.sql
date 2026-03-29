-- Run in Supabase Dashboard → SQL Editor.
-- Idempotent: safe to run more than once.
-- Fixes PostgREST: "Could not find the dose_period column of pet_medications in the schema cache"
--
-- After running: wait a few seconds (or Settings → API → Reload schema) if errors persist.

alter table public.pet_medications
  add column if not exists doses_per_period integer,
  add column if not exists dose_period text,
  add column if not exists reminder_time text;

comment on column public.pet_medications.doses_per_period is
  'Number of doses per dose_period (e.g. 2 per day)';
comment on column public.pet_medications.dose_period is
  'day | week | month';
comment on column public.pet_medications.reminder_time is
  'Preferred local reminder time as HH:mm (24h)';
