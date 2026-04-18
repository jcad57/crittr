-- Co-care: inviter and registered invitee must have active Crittr Pro at invite time;
-- invitee must have Pro to accept (pet_co_carers insert).

-- ── Preflight for app (friendly errors before insert) ────────────────────────
CREATE OR REPLACE FUNCTION public.validate_co_care_invite_send(
  p_pet_id uuid,
  p_invitee_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner uuid;
  v_email text;
  v_invitee uuid;
BEGIN
  v_email := lower(trim(p_invitee_email));
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'email_required');
  END IF;

  SELECT owner_id INTO v_owner FROM public.pets WHERE id = p_pet_id;
  IF v_owner IS NULL OR v_owner IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_owner');
  END IF;

  IF NOT public.user_has_crittr_pro() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'inviter_not_pro');
  END IF;

  SELECT au.id INTO v_invitee FROM auth.users au WHERE lower(au.email) = v_email LIMIT 1;

  IF v_invitee IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'code', 'email_only');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_invitee
      AND p.crittr_pro_until IS NOT NULL
      AND p.crittr_pro_until > now()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invitee_not_pro');
  END IF;

  RETURN jsonb_build_object('ok', true, 'code', 'registered_pro');
END;
$$;

COMMENT ON FUNCTION public.validate_co_care_invite_send(uuid, text) IS
  'Validates co-care invite: caller owns pet, has Pro; if invitee email matches a Crittr user, they must have active Pro.';

REVOKE ALL ON FUNCTION public.validate_co_care_invite_send(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_co_care_invite_send(uuid, text) TO authenticated;

-- ── Trigger: enforce on INSERT (defense in depth vs malicious clients) ────────
CREATE OR REPLACE FUNCTION public.trg_co_carer_invites_require_crittr_pro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_has_crittr_pro(NEW.invited_by) THEN
    RAISE EXCEPTION 'Co-care invites require Crittr Pro on your account.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.invited_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = NEW.invited_user_id
        AND p.crittr_pro_until IS NOT NULL
        AND p.crittr_pro_until > now()
    ) THEN
      RAISE EXCEPTION 'This person must have Crittr Pro before you can invite them to co-care.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_co_carer_invites_require_crittr_pro ON public.co_carer_invites;
CREATE TRIGGER trg_co_carer_invites_require_crittr_pro
  BEFORE INSERT ON public.co_carer_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_co_carer_invites_require_crittr_pro();

-- ── RLS: inviter must be Pro ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own invites" ON public.co_carer_invites;
CREATE POLICY "Users can insert own invites"
  ON public.co_carer_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = invited_by
    AND public.user_has_crittr_pro()
  );

-- ── RLS: accepting co-care requires Pro ──────────────────────────────────────
DROP POLICY IF EXISTS "Invitees can accept and create own co-carer row" ON public.pet_co_carers;
CREATE POLICY "Invitees can accept and create own co-carer row"
  ON public.pet_co_carers FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.user_has_crittr_pro()
    AND EXISTS (
      SELECT 1 FROM public.co_carer_invites
      WHERE co_carer_invites.pet_id = pet_co_carers.pet_id
        AND co_carer_invites.invited_user_id = auth.uid()
        AND co_carer_invites.status IN ('pending', 'accepted')
    )
  );
