-- Ensures schedule columns exist on remote DBs that missed 20260328120000_pet_medications_schedule.sql
-- (Same as supabase/sql/pet_medications_schedule_columns.sql without the optional CHECK.)

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
