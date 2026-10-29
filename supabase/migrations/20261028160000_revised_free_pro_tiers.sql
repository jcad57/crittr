-- Free: three owned pets (including memorialized/archived), one co-carer per pet.
-- Pro: unlimited pets and co-carers. Keep all data on downgrade.
-- Requires the subscription reliability and co-care integrity migrations.
BEGIN;

CREATE OR REPLACE FUNCTION public.pet_is_within_owner_plan(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM pets p WHERE p.id=target AND
  (account_has_verified_pro(p.owner_id) OR p.id IN
   (SELECT x.id FROM pets x WHERE x.owner_id=p.owner_id ORDER BY x.created_at,x.id LIMIT 3)));
$$;
CREATE OR REPLACE FUNCTION public.co_carer_has_plan_access(target uuid, carer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT pet_is_within_owner_plan(target) AND EXISTS (
  SELECT 1 FROM pet_co_carers c JOIN pets p ON p.id=c.pet_id
  WHERE c.pet_id=target AND c.user_id=carer AND c.invited_by=p.owner_id
   AND (account_has_verified_pro(p.owner_id) OR c.id=(SELECT x.id FROM pet_co_carers x
    WHERE x.pet_id=p.id AND x.invited_by=p.owner_id ORDER BY x.created_at,x.id LIMIT 1)));
$$;
REVOKE ALL ON FUNCTION public.pet_is_within_owner_plan(uuid), public.co_carer_has_plan_access(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.pet_is_writable(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM pets p WHERE p.id=target AND
  ((p.owner_id=auth.uid() AND pet_is_within_owner_plan(p.id)) OR co_carer_has_plan_access(p.id,auth.uid())));
$$;
CREATE OR REPLACE FUNCTION public.can_access_pet(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM pets p WHERE p.id=p_pet_id AND
  (p.owner_id=auth.uid() OR co_carer_has_plan_access(p.id,auth.uid())));
$$;
CREATE OR REPLACE FUNCTION public.guard_free_pet_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.role()='service_role' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
   RAISE EXCEPTION 'Pet ownership changes require an administrator' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.owner_id::text,0));
 -- An idempotent retry must reach the existing unique-key conflict handler.
 IF NEW.client_request_id IS NOT NULL AND EXISTS(SELECT 1 FROM pets
  WHERE owner_id=NEW.owner_id AND client_request_id=NEW.client_request_id) THEN RETURN NEW; END IF;
 IF NOT account_has_verified_pro(NEW.owner_id) AND
  (SELECT count(*) FROM pets WHERE owner_id=NEW.owner_id)>=3 THEN
  RAISE EXCEPTION 'Free includes 3 pets. Upgrade to Crittr Pro for unlimited pets.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;

-- Pending invitations reserve a slot. Duplicate historical invitations to the
-- same email reserve only one; a membership replaces its pending invitation.
CREATE OR REPLACE FUNCTION public.co_care_slots_used(target uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT (SELECT count(*) FROM pet_co_carers WHERE pet_id=target) +
  (SELECT count(DISTINCT lower(trim(i.email))) FROM co_carer_invites i
   WHERE i.pet_id=target AND i.status='pending' AND NOT EXISTS
    (SELECT 1 FROM pet_co_carers c WHERE c.pet_id=target AND c.user_id=i.invited_user_id));
$$;
REVOKE ALL ON FUNCTION public.co_care_slots_used(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.can_invite_co_carer(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM pets p WHERE p.id=p_pet_id AND p.owner_id=auth.uid()
  AND pet_is_within_owner_plan(p.id) AND (account_has_verified_pro(p.owner_id) OR co_care_slots_used(p.id)<1));
$$;
REVOKE ALL ON FUNCTION public.can_invite_co_carer(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_invite_co_carer(uuid) TO authenticated;

DROP TRIGGER IF EXISTS trg_co_carer_invites_require_crittr_pro ON public.co_carer_invites;
CREATE OR REPLACE FUNCTION public.guard_co_care_invite_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.pet_id::text,1));
 IF NOT pet_is_within_owner_plan(NEW.pet_id) OR
  (NOT account_has_verified_pro(NEW.invited_by) AND co_care_slots_used(NEW.pet_id)>=1) THEN
  RAISE EXCEPTION 'Free includes 1 co-carer per pet. The pet owner needs Crittr Pro to add more.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS co_care_invite_limit ON public.co_carer_invites;
CREATE TRIGGER co_care_invite_limit BEFORE INSERT ON public.co_carer_invites
 FOR EACH ROW EXECUTE FUNCTION public.guard_co_care_invite_limit();
DROP POLICY IF EXISTS "Users can insert own invites" ON public.co_carer_invites;
CREATE POLICY "Users can insert own invites" ON public.co_carer_invites FOR INSERT TO authenticated
 WITH CHECK (auth.uid()=invited_by AND public.is_pet_owner(pet_id));
DROP POLICY IF EXISTS "Invitees can accept and create own co-carer row" ON public.pet_co_carers;
CREATE POLICY "Invitees can accept and create own co-carer row" ON public.pet_co_carers FOR INSERT TO authenticated
 WITH CHECK (auth.uid()=user_id AND EXISTS(SELECT 1 FROM public.co_carer_invites i
  WHERE i.pet_id=pet_co_carers.pet_id AND i.invited_user_id=auth.uid() AND i.status='pending'));

CREATE OR REPLACE FUNCTION public.guard_co_care_membership_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; invitation public.co_carer_invites;
BEGIN
 IF auth.role()='service_role' OR auth.role() IS NULL THEN RETURN NEW; END IF;
 SELECT owner_id INTO owner FROM pets WHERE id=NEW.pet_id;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.pet_id IS DISTINCT FROM OLD.pet_id OR
  NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.invited_by IS DISTINCT FROM OLD.invited_by) THEN
  RAISE EXCEPTION 'Membership identity cannot be changed' USING ERRCODE='42501';
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.pet_id::text,1));
 IF TG_OP='INSERT' AND (NOT pet_is_within_owner_plan(NEW.pet_id) OR
  (NOT account_has_verified_pro(owner) AND EXISTS(SELECT 1 FROM pet_co_carers
   WHERE pet_id=NEW.pet_id AND user_id<>NEW.user_id))) THEN
  RAISE EXCEPTION 'Free includes 1 co-carer per pet. The pet owner needs Crittr Pro to add more.' USING ERRCODE='42501';
 END IF;
 IF auth.uid()=owner THEN
  IF TG_OP='INSERT' THEN NEW.invited_by:=owner; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP<>'INSERT' OR auth.uid() IS DISTINCT FROM NEW.user_id THEN
  RAISE EXCEPTION 'Only the pet owner can change permissions' USING ERRCODE='42501';
 END IF;
 SELECT * INTO invitation FROM co_carer_invites WHERE pet_id=NEW.pet_id
  AND invited_user_id=auth.uid() AND invited_by=owner AND status='pending'
  ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'A pending owner invitation is required' USING ERRCODE='42501'; END IF;
 NEW.permissions:=invitation.permissions;
 NEW.invited_by:=owner;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.accept_co_care_invite(target_invite uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invitation public.co_carer_invites; owner uuid; accepter uuid:=auth.uid();
BEGIN
 IF accepter IS NULL THEN RAISE EXCEPTION 'Sign in to accept this invitation' USING ERRCODE='42501'; END IF;
 -- All membership/limit mutations for this pet serialize on the same lock.
 SELECT * INTO invitation FROM co_carer_invites WHERE id=target_invite AND invited_user_id=accepter;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(invitation.pet_id::text,1));
 SELECT * INTO invitation FROM co_carer_invites WHERE id=target_invite AND invited_user_id=accepter FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='42501'; END IF;
 SELECT owner_id INTO owner FROM pets WHERE id=invitation.pet_id;
 IF owner IS NULL OR invitation.invited_by IS DISTINCT FROM owner THEN
  RAISE EXCEPTION 'Invitation is no longer valid' USING ERRCODE='42501'; END IF;
 IF invitation.status='accepted' AND EXISTS(SELECT 1 FROM pet_co_carers
  WHERE pet_id=invitation.pet_id AND user_id=accepter AND invited_by=owner) THEN RETURN invitation.pet_id; END IF;
 IF invitation.status<>'pending' THEN RAISE EXCEPTION 'Invitation is no longer pending' USING ERRCODE='42501'; END IF;
 INSERT INTO pet_co_carers(pet_id,user_id,invited_by,permissions)
  VALUES(invitation.pet_id,accepter,owner,invitation.permissions) ON CONFLICT(pet_id,user_id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM pet_co_carers WHERE pet_id=invitation.pet_id
  AND user_id=accepter AND invited_by=owner) THEN
  RAISE EXCEPTION 'Co-care membership is no longer valid' USING ERRCODE='42501';
 END IF;
 UPDATE co_carer_invites SET status='accepted',responded_at=now() WHERE id=invitation.id AND status='pending';
 RETURN invitation.pet_id;
END $$;

CREATE OR REPLACE FUNCTION public.validate_co_care_invite_send(p_pet_id uuid,p_invitee_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,auth AS $$
DECLARE email text:=lower(trim(p_invitee_email)); invitee uuid;
BEGIN
 IF email IS NULL OR email='' THEN RETURN jsonb_build_object('ok',false,'code','email_required'); END IF;
 IF NOT is_pet_owner(p_pet_id) THEN RETURN jsonb_build_object('ok',false,'code','not_owner'); END IF;
 IF NOT can_invite_co_carer(p_pet_id) THEN RETURN jsonb_build_object('ok',false,'code','co_carer_limit'); END IF;
 SELECT id INTO invitee FROM auth.users WHERE lower(auth.users.email)=email LIMIT 1;
 IF invitee=auth.uid() THEN RETURN jsonb_build_object('ok',false,'code','self_invite'); END IF;
 IF EXISTS(SELECT 1 FROM pet_co_carers WHERE pet_id=p_pet_id AND user_id=invitee) THEN
  RETURN jsonb_build_object('ok',false,'code','already_co_carer'); END IF;
 RETURN jsonb_build_object('ok',true,'code',CASE WHEN invitee IS NULL THEN 'email_only' ELSE 'registered' END);
END $$;

-- Free invitees get the same actionable invitation as Pro invitees.
CREATE OR REPLACE FUNCTION public.notify_co_carer_invite_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 PERFORM public.notify_co_care_linked_invite(NEW.id);
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.notify_on_co_carer_invite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.invited_user_id IS NULL AND NEW.invited_user_id IS NOT NULL THEN
  PERFORM public.notify_co_care_linked_invite(NEW.id);
 END IF;
 RETURN NEW;
END $$;
-- Linked email invitations use the same notification insertion implementation.
CREATE OR REPLACE FUNCTION public.notify_co_care_linked_invite(target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.co_carer_invites; inviter_name text; pet_name text;
BEGIN
 SELECT * INTO i FROM co_carer_invites WHERE id=target AND status='pending';
 IF NOT FOUND OR i.invited_user_id IS NULL THEN RETURN; END IF;
 IF EXISTS(SELECT 1 FROM notifications WHERE user_id=i.invited_user_id
  AND type IN ('co_care_invite','co_care_invite_requires_pro') AND data->>'invite_id'=i.id::text) THEN RETURN; END IF;
 SELECT COALESCE(NULLIF(trim(concat_ws(' ',first_name,last_name)),''),'Someone') INTO inviter_name FROM profiles WHERE id=i.invited_by;
 SELECT name INTO pet_name FROM pets WHERE id=i.pet_id;
 INSERT INTO notifications(user_id,type,title,body,data) VALUES(i.invited_user_id,'co_care_invite','Co-care invitation',
  COALESCE(inviter_name,'Someone')||' invited you to co-care for '||COALESCE(pet_name,'their pet')||'.',
  jsonb_build_object('pet_id',i.pet_id,'invite_id',i.id));
END $$;
REVOKE ALL ON FUNCTION public.notify_co_care_linked_invite(uuid) FROM PUBLIC,anon,authenticated;
UPDATE notifications n SET type='co_care_invite',data=n.data-'href',
 body=COALESCE(NULLIF(trim(concat_ws(' ',pf.first_name,pf.last_name)),''),'Someone')||' invited you to co-care for '||COALESCE(p.name,'their pet')||'.'
 FROM co_carer_invites i JOIN pets p ON p.id=i.pet_id LEFT JOIN profiles pf ON pf.id=i.invited_by
 WHERE n.type='co_care_invite_requires_pro' AND n.data->>'invite_id'=i.id::text AND i.status='pending';

CREATE OR REPLACE FUNCTION public.push_recipient_has_pet_access(p_pet_id uuid,p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS(SELECT 1 FROM pets WHERE id=p_pet_id AND owner_id=p_user_id) OR co_carer_has_plan_access(p_pet_id,p_user_id);
$$;
COMMENT ON FUNCTION public.validate_co_care_invite_send(uuid,text) IS 'Owner tier controls capacity: one co-carer per pet on Free, unlimited on Pro; invitees may be Free.';
NOTIFY pgrst,'reload schema';
COMMIT;
