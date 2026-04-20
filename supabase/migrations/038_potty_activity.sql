-- Potty break activity: time, pee/poo flags, optional location (reuses `location`), notes.

ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'potty';

ALTER TABLE public.pet_activities
  ADD COLUMN IF NOT EXISTS potty_pee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS potty_poo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pet_activities.potty_pee IS
  'For activity_type potty: pet urinated.';
COMMENT ON COLUMN public.pet_activities.potty_poo IS
  'For activity_type potty: pet defecated.';

ALTER TABLE public.pet_activities
  DROP CONSTRAINT IF EXISTS pet_activities_potty_flags_chk;

-- Compare via text so we do not reference the new enum label in the same
-- transaction as ADD VALUE (PostgreSQL 55P04).
ALTER TABLE public.pet_activities
  ADD CONSTRAINT pet_activities_potty_flags_chk
  CHECK (
    activity_type::text IS DISTINCT FROM 'potty'
    OR potty_pee = true
    OR potty_poo = true
  );
