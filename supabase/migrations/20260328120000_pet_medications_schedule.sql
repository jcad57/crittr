-- Run in Supabase SQL editor if migrations are not applied automatically.
-- Adds structured schedule fields for pet medications.

alter table public.pet_medications
  add column if not exists doses_per_period integer,
  add column if not exists dose_period text,
  add column if not exists reminder_time text;

-- Optional: enforce allowed values for dose_period (uncomment if desired)
-- alter table public.pet_medications
--   add constraint pet_medications_dose_period_check
--   check (dose_period is null or dose_period in ('day', 'week', 'month'));

comment on column public.pet_medications.doses_per_period is
  'Number of doses per dose_period (e.g. 2 per day)';
comment on column public.pet_medications.dose_period is
  'day | week | month';
comment on column public.pet_medications.reminder_time is
  'Preferred local reminder time as HH:mm (24h)';
