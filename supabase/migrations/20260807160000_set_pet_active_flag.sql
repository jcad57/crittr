-- Atomic active-pet selection.
--
-- The client used to persist a selection with two statements: set `is_active`
-- on the target, then clear it everywhere else. Two taps in quick succession
-- interleave as (set A, set B, clear-but-A, clear-but-B) and land on zero
-- active pets, so the next cold start falls back to the first pet instead of
-- the one the user picked. Picking a co-cared pet was worse: the set half
-- matched no rows while the clear half still wiped every owned pet's flag.
--
-- One UPDATE keeps the "exactly one active owned pet" invariant under
-- concurrency — a second caller blocks on the same row locks and re-evaluates
-- after the first commits, so last tap wins cleanly.

CREATE OR REPLACE FUNCTION public.set_pet_active_flag(target_pet uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owns boolean;
  v_current uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'set_pet_active_flag: not authenticated'
      USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.pets
    WHERE id = target_pet
      AND owner_id = v_caller
      AND is_memorialized = false
      AND is_archived = false
  ) INTO v_owns;

  IF NOT v_owns THEN
    IF NOT public.can_access_pet(target_pet) THEN
      RAISE EXCEPTION 'set_pet_active_flag: pet not accessible'
        USING ERRCODE = '42501';
    END IF;

    -- Co-cared pets have no `is_active` of their own; that column belongs to
    -- the owner's account. Leave the caller's own flags untouched and report
    -- which of their pets is still active so the client cache stays truthful.
    SELECT id INTO v_current
    FROM public.pets
    WHERE owner_id = v_caller
      AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    RETURN v_current;
  END IF;

  UPDATE public.pets
  SET is_active = (id = target_pet)
  WHERE owner_id = v_caller
    AND is_active IS DISTINCT FROM (id = target_pet);

  RETURN target_pet;
END;
$$;

COMMENT ON FUNCTION public.set_pet_active_flag(uuid) IS
  'Atomically makes one owned pet `is_active` and clears the rest. Returns the pet that ended up '
  'active for the caller, or NULL when they own no pets. Selecting a co-cared pet is a no-op that '
  'returns the caller''s existing active pet.';

REVOKE ALL ON FUNCTION public.set_pet_active_flag(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_pet_active_flag(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pet_active_flag(uuid) TO service_role;

-- ── Repair the damage the interleaved two-step write already did ────────────
-- `repair_pet_active_flag` refuses callers without a matching JWT, so the
-- backfill runs the same rules as plain statements.

-- A pet that is gone from the picker must not hold the flag.
UPDATE public.pets
SET is_active = false
WHERE is_active = true
  AND (is_memorialized = true OR is_archived = true);

-- Interleaved clears could also leave two owned pets active at once.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY owner_id ORDER BY created_at ASC) AS rn
  FROM public.pets
  WHERE is_active = true
)
UPDATE public.pets
SET is_active = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Owners left with living pets but nothing active fall back to their oldest.
WITH needs_repair AS (
  SELECT owner_id
  FROM public.pets
  WHERE is_memorialized = false
    AND is_archived = false
  GROUP BY owner_id
  HAVING COUNT(*) FILTER (WHERE is_active) = 0
),
target AS (
  SELECT DISTINCT ON (p.owner_id) p.id
  FROM public.pets p
  JOIN needs_repair r ON r.owner_id = p.owner_id
  WHERE p.is_memorialized = false
    AND p.is_archived = false
  ORDER BY p.owner_id, p.created_at ASC
)
UPDATE public.pets
SET is_active = true
WHERE id IN (SELECT id FROM target);
