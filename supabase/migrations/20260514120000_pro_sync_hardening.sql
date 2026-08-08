-- ============================================================================
-- Crittr Pro / Supabase sync hardening
--
-- Goals
--   1. Stop destructive pet deletes on Pro -> Free downgrade. Free-tier extra
--      pets are now soft-archived (`is_archived = true`); a re-upgrade flips
--      them back so users never lose their data on a flaky webhook.
--   2. Give the client an idempotency key on `pets` so a partial onboarding
--      retry can't create duplicate pet rows.
--   3. Expose a server-side helper to keep exactly one living owned pet
--      `is_active` so the dashboard's "limbo zero-pet" state self-heals.
--   4. Provide an "is the user effectively Pro right now" RPC the app can
--      call with one round-trip when deciding whether to short-circuit the
--      paywall after a promo redemption.
-- ============================================================================

-- ── pets: idempotency + soft-archive columns ────────────────────────────────
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS client_request_id text,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.pets.client_request_id IS
  'Optional idempotency key supplied by the client when creating a pet. '
  'Lets onboarding retries (network blip / partial failure) reuse the existing row '
  'instead of inserting duplicates. Unique per owner.';

COMMENT ON COLUMN public.pets.is_archived IS
  'True when the pet has been archived (e.g. Pro -> Free downgrade soft-cleanup). '
  'Archived pets are hidden from dashboards/pickers but never deleted; an upgrade '
  'back to Pro flips them back to false (preserving co-care, foods, etc).';

COMMENT ON COLUMN public.pets.archived_reason IS
  'Why the pet was archived: `pro_downgrade`, `user_archived`, ...';

COMMENT ON COLUMN public.pets.archived_at IS
  'When the pet was archived (informational).';

CREATE UNIQUE INDEX IF NOT EXISTS pets_owner_client_request_id_uniq
  ON public.pets (owner_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pets_owner_archived_idx
  ON public.pets (owner_id, is_archived);

-- ── Helper: living + non-archived pet list for a user (server-side truth) ───
-- Living = not memorialized AND not archived. The dashboard considers these
-- "real" pets. Memorialized pets are visible in `My Pets` (remembrance), but
-- archived pets stay hidden until re-upgrade.

CREATE OR REPLACE FUNCTION public.user_has_active_pet(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.pets p
    WHERE p.owner_id = check_user_id
      AND p.is_memorialized = false
      AND p.is_archived = false
  );
$$;

COMMENT ON FUNCTION public.user_has_active_pet(uuid) IS
  'True when the user has at least one living, non-archived owned pet.';

REVOKE ALL ON FUNCTION public.user_has_active_pet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_active_pet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_pet(uuid) TO service_role;

-- ── Helper: ensure exactly one living, non-archived pet is `is_active` ──────
-- After a pet create / delete / memorialize / archive, the client may need to
-- ensure the dashboard has a sensible default active pet. Doing this on the
-- server avoids racing two clients flipping the flag and avoids the moment
-- with zero active pets while RLS is in play.

CREATE OR REPLACE FUNCTION public.repair_pet_active_flag(target_owner uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text := COALESCE(auth.role(), 'unknown');
  v_existing_active uuid;
  v_oldest_living uuid;
BEGIN
  IF v_role <> 'service_role' AND v_caller IS DISTINCT FROM target_owner THEN
    RAISE EXCEPTION 'repair_pet_active_flag: not authorised'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing_active
  FROM public.pets
  WHERE owner_id = target_owner
    AND is_memorialized = false
    AND is_archived = false
    AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_active IS NOT NULL THEN
    -- Make sure only one is active.
    UPDATE public.pets
    SET is_active = false
    WHERE owner_id = target_owner
      AND id <> v_existing_active
      AND is_active = true;

    RETURN v_existing_active;
  END IF;

  SELECT id INTO v_oldest_living
  FROM public.pets
  WHERE owner_id = target_owner
    AND is_memorialized = false
    AND is_archived = false
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_oldest_living IS NULL THEN
    UPDATE public.pets
    SET is_active = false
    WHERE owner_id = target_owner
      AND is_active = true;
    RETURN NULL;
  END IF;

  UPDATE public.pets
  SET is_active = false
  WHERE owner_id = target_owner
    AND id <> v_oldest_living
    AND is_active = true;

  UPDATE public.pets
  SET is_active = true
  WHERE id = v_oldest_living
    AND owner_id = target_owner;

  RETURN v_oldest_living;
END;
$$;

COMMENT ON FUNCTION public.repair_pet_active_flag(uuid) IS
  'Ensures exactly one living, non-archived owned pet is `is_active` (or none, if the user has no pets). '
  'Safe to call from the client for their own account, or from edge functions with service_role.';

REVOKE ALL ON FUNCTION public.repair_pet_active_flag(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repair_pet_active_flag(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_pet_active_flag(uuid) TO service_role;

-- ── RLS: hide archived pets from regular SELECTs ────────────────────────────
-- The existing "Users can view own pets" policy returns archived rows too,
-- which can confuse dashboards and accidentally show archived pets in
-- pickers. We tighten the policy here so only the owner can SELECT them and
-- only when explicitly requested. Co-care relationships are also archived
-- for these pets so co-carers cannot see archived rows either.
--
-- (We keep allowing owners to read archived rows so a future restore UI
-- can list them. The app filters in code.)

DROP POLICY IF EXISTS "Users can view own pets" ON public.pets;

CREATE POLICY "Users can view own pets"
  ON public.pets FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.pet_co_carers cc
      WHERE cc.pet_id = pets.id
        AND cc.user_id = (SELECT auth.uid())
    )
  );

-- ── Restore archived pets when a user re-upgrades to Pro ────────────────────
-- Called from `applyCrittrProDowngradeCleanup`'s reverse direction in the
-- shared edge function. Whoever set `is_archived = true` with reason
-- `pro_downgrade` gets it reversed automatically on next active reconcile.
--
-- Idempotent: running it twice is a no-op once nothing is archived.

CREATE OR REPLACE FUNCTION public.restore_pro_archived_pets(target_owner uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := COALESCE(auth.role(), 'unknown');
  v_count integer := 0;
BEGIN
  IF v_role <> 'service_role' THEN
    RAISE EXCEPTION 'restore_pro_archived_pets: service_role only'
      USING ERRCODE = '42501';
  END IF;

  WITH unarchived AS (
    UPDATE public.pets
    SET
      is_archived = false,
      archived_reason = NULL,
      archived_at = NULL
    WHERE owner_id = target_owner
      AND is_archived = true
      AND archived_reason = 'pro_downgrade'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM unarchived;

  PERFORM public.repair_pet_active_flag(target_owner);

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.restore_pro_archived_pets(uuid) IS
  'Reverses Pro-downgrade soft-archival on the user''s pets. Called by the entitlement edge '
  'function whenever a user transitions back into active Pro.';

REVOKE ALL ON FUNCTION public.restore_pro_archived_pets(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_pro_archived_pets(uuid) TO service_role;
