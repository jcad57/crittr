-- Custom medication intervals (e.g. every 3 months). Pair interval_count with interval_unit.
-- When set, doses_per_period / dose_period may be null.

alter table public.pet_medications
  add column if not exists interval_count integer,
  add column if not exists interval_unit text;

comment on column public.pet_medications.interval_count is
  'For custom schedules: N in "every N days/weeks/months" (e.g. 3 for every 3 months)';
comment on column public.pet_medications.interval_unit is
  'day | week | month — unit for interval_count; null when using standard per-period schedule only';
