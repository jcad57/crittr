-- ============================================================================
-- Crittr: Pet profile fields (hero tags, details, records)
-- Run after 006_pets_microchip_number.sql (or merge with prior migrations).
-- Safe to re-run: uses IF NOT EXISTS.
-- ============================================================================

alter table public.pets
  add column if not exists is_sterilized boolean,
  add column if not exists primary_vet_clinic text,
  add column if not exists primary_vet_address text,
  add column if not exists primary_vet_name text,
  add column if not exists is_insured boolean,
  add column if not exists insurance_provider text;

comment on column public.pets.is_sterilized is
  'Spayed/neutered when true; intact when false; null if unknown.';
comment on column public.pets.primary_vet_clinic is
  'Primary veterinary clinic name.';
comment on column public.pets.primary_vet_address is
  'Mailing or street address for the primary veterinary clinic.';
comment on column public.pets.primary_vet_name is
  'Primary veterinarian name (optional).';
comment on column public.pets.is_insured is
  'Whether the pet has active insurance; null if not specified.';
comment on column public.pets.insurance_provider is
  'Insurance carrier or plan name when insured.';
