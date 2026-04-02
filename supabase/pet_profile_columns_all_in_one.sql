-- ============================================================================
-- Copy-paste into Supabase SQL Editor (idempotent where possible).
-- For existing DBs that already ran older migrations: 008 drops blood_type.
-- ============================================================================

alter table public.pets
  add column if not exists microchip_number text;

alter table public.pets
  add column if not exists is_sterilized boolean,
  add column if not exists primary_vet_clinic text,
  add column if not exists primary_vet_address text,
  add column if not exists primary_vet_name text,
  add column if not exists is_insured boolean,
  add column if not exists insurance_provider text,
  add column if not exists insurance_policy_number text;

alter table public.pets
  drop column if exists blood_type;
