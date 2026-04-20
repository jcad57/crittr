-- 037_pet_vaccinations_extract_fields.sql
-- Extends pet_vaccinations with fields commonly found on vet-issued vaccination records,
-- so data extracted from uploaded medical documents (via Crittr's document scanner) can be
-- stored structurally instead of stuffed into the free-form `notes` column.
--
-- All columns are additive and nullable: existing UI and service code that only reads the
-- pre-existing fields continues to work unchanged. `expires_on` is retained (it has been the
-- "next due" surrogate up to now); `next_due_date` is a future, semantically-clearer field
-- that new UI can migrate to over time.

alter table public.pet_vaccinations
  add column if not exists administered_on date,
  add column if not exists administered_by text,
  add column if not exists lot_number text,
  add column if not exists next_due_date date;

-- Helpful index for future "due soon" dashboards. Safe no-op if column already indexed.
create index if not exists idx_pet_vaccinations_next_due_date
  on public.pet_vaccinations (next_due_date)
  where next_due_date is not null;
