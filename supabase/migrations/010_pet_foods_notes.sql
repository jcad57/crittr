-- Per-food feeding notes (e.g. timing breakdown) for pet_foods rows.
alter table public.pet_foods
  add column if not exists notes text;

comment on column public.pet_foods.notes is 'Optional owner notes (e.g. portion split across meals).';

-- Backfill: legacy rows may have null meals_per_day; daily progress treats used piece counts before.
update public.pet_foods
set meals_per_day = 1
where meals_per_day is null;
