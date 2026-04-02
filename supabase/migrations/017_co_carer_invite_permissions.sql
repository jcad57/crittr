-- Store intended co-care permissions on the invite so they apply when the invitee accepts.

ALTER TABLE public.co_carer_invites
  ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{
    "can_log_activities": true,
    "can_edit_pet_profile": false,
    "can_manage_food": false,
    "can_manage_medications": false,
    "can_manage_vaccinations": false,
    "can_manage_vet_visits": false
  }'::jsonb;

-- Inviters can update pending invites (e.g. permission presets before acceptance).
DROP POLICY IF EXISTS "Inviters can update own pending invites" ON public.co_carer_invites;
CREATE POLICY "Inviters can update own pending invites"
  ON public.co_carer_invites FOR UPDATE
  TO authenticated
  USING (auth.uid() = invited_by AND status = 'pending')
  WITH CHECK (auth.uid() = invited_by AND status = 'pending');
