-- 042_drop_pet_vaccinations_next_due_date.sql
-- The app uses a single date — `expires_on` — for "due again" / expiry and for due-soon
-- reminders (see utils/healthTraffic#vaccinationTraffic). `next_due_date` duplicated that;
-- backfill then drop the column.

update public.pet_vaccinations
set expires_on = next_due_date
where expires_on is null
  and next_due_date is not null;

drop index if exists public.idx_pet_vaccinations_next_due_date;

alter table public.pet_vaccinations
  drop column if exists next_due_date;
