-- Run the entire file in Supabase SQL Editor as postgres. Safe to rerun.
-- Requires the verified Pro helper already installed by install-subscription-sync.sql.
-- This scoped repair installs only the acceptance RPC and reloads the API schema.
BEGIN;

-- Standalone repair for deployments without the broader co-care integrity rollout.
-- The app calls this exact RPC with { target_invite: inviteId }.
CREATE OR REPLACE FUNCTION public.accept_co_care_invite(target_invite uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation public.co_carer_invites;
  pet_owner uuid;
  accepter uuid := auth.uid();
BEGIN
  IF accepter IS NULL THEN
    RAISE EXCEPTION 'Sign in to accept this invitation' USING ERRCODE = '42501';
  END IF;

  -- Serialize retries for this invite and authorize from the authenticated JWT.
  SELECT * INTO invitation
  FROM public.co_carer_invites
  WHERE id = target_invite AND invited_user_id = accepter
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id INTO pet_owner
  FROM public.pets WHERE id = invitation.pet_id FOR SHARE;
  IF pet_owner IS NULL OR invitation.invited_by IS DISTINCT FROM pet_owner THEN
    RAISE EXCEPTION 'Invitation is no longer valid' USING ERRCODE = '42501';
  END IF;
  IF public.account_has_verified_pro(pet_owner) IS NOT TRUE
     OR public.account_has_verified_pro(accepter) IS NOT TRUE THEN
    RAISE EXCEPTION 'Both accounts need Crittr Pro to share care' USING ERRCODE = '42501';
  END IF;

  IF invitation.status = 'accepted' AND EXISTS (
    SELECT 1 FROM public.pet_co_carers
    WHERE pet_id = invitation.pet_id AND user_id = accepter AND invited_by = pet_owner
  ) THEN
    RETURN invitation.pet_id;
  END IF;
  IF invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.pet_co_carers (pet_id, user_id, invited_by, permissions)
  VALUES (invitation.pet_id, accepter, pet_owner, invitation.permissions)
  ON CONFLICT (pet_id, user_id) DO NOTHING;

  IF NOT EXISTS (
    SELECT 1 FROM public.pet_co_carers
    WHERE pet_id = invitation.pet_id AND user_id = accepter AND invited_by = pet_owner
  ) THEN
    RAISE EXCEPTION 'Co-care membership is no longer valid' USING ERRCODE = '42501';
  END IF;

  -- Older deployed schemas have no consume_co_care_invitations trigger.
  -- Keep this explicit so membership and response always commit together.
  UPDATE public.co_carer_invites
  SET status = 'accepted', responded_at = now()
  WHERE id = invitation.id AND status = 'pending';

  RETURN invitation.pet_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_co_care_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_co_care_invite(uuid) TO authenticated;

-- Make the RPC discoverable immediately after applying the repair.
NOTIFY pgrst, 'reload schema';

COMMIT;
