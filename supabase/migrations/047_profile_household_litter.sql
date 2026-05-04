-- Household litter goals: one schedule per pet owner (all cats share progress).
-- Migrated from pets.* for existing cat rows (first non-null per owner).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS litter_cleaning_period text,
  ADD COLUMN IF NOT EXISTS litter_cleanings_per_period integer;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_litter_cleaning_period_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_litter_cleaning_period_chk
  CHECK (
    litter_cleaning_period IS NULL
    OR litter_cleaning_period IN ('day', 'week', 'month')
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_litter_cleanings_per_period_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_litter_cleanings_per_period_chk
  CHECK (
    litter_cleanings_per_period IS NULL
    OR litter_cleanings_per_period >= 1
  );

COMMENT ON COLUMN public.profiles.litter_cleaning_period IS
  'Household litter cleaning interval when the user has cats (daily progress Maintenance).';

COMMENT ON COLUMN public.profiles.litter_cleanings_per_period IS
  'Target cleanings per litter_cleaning_period for the household (all cats).';

-- Backfill from cats: one row per owner (pick minimum pet id among cats with litter set).
WITH first_cat AS (
  SELECT DISTINCT ON (owner_id)
    owner_id,
    litter_cleaning_period,
    litter_cleanings_per_period
  FROM public.pets
  WHERE pet_type = 'cat'
    AND litter_cleaning_period IS NOT NULL
    AND litter_cleanings_per_period IS NOT NULL
  ORDER BY owner_id, id ASC
)
UPDATE public.profiles p
SET
  litter_cleaning_period = f.litter_cleaning_period,
  litter_cleanings_per_period = f.litter_cleanings_per_period
FROM first_cat f
WHERE p.id = f.owner_id
  AND p.litter_cleaning_period IS NULL;

-- Co-carers / owners: read pet owner's household litter without full profiles SELECT.
CREATE OR REPLACE FUNCTION public.household_litter_goals_for_pet(target_pet uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'litter_cleaning_period', prof.litter_cleaning_period,
    'litter_cleanings_per_period', prof.litter_cleanings_per_period
  )
  FROM public.pets pet
  INNER JOIN public.profiles prof ON prof.id = pet.owner_id
  WHERE pet.id = target_pet
    AND (
      pet.owner_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.pet_co_carers cc
        WHERE cc.pet_id = pet.id
          AND cc.user_id = (SELECT auth.uid())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.household_litter_goals_for_pet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.household_litter_goals_for_pet(uuid) TO authenticated;
