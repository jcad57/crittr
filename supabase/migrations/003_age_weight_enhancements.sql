-- ============================================================================
-- Crittr: Age/weight enhancements
-- Run this AFTER 002_reference_data.sql
-- ============================================================================

alter table public.pets
  add column if not exists age_months integer,
  add column if not exists date_of_birth date,
  add column if not exists weight_unit text default 'lbs'
    check (weight_unit in ('lbs', 'kg'));
