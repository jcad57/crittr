-- Idempotent: run in Supabase SQL Editor if migrations are not applied.
-- See migrations/014_pet_medications_last_given_on.sql

alter table public.pet_medications
  add column if not exists last_given_on date;

comment on column public.pet_medications.last_given_on is
  'Date the medication was last given (optional; YYYY-MM-DD).';
