-- Invitations are an authorization grant. Clients cannot retarget or replay them.
CREATE FUNCTION public.guard_co_care_invite_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.role() = 'service_role' OR auth.role() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP = 'INSERT' THEN
  IF NEW.invited_by IS DISTINCT FROM auth.uid() OR NOT public.is_pet_owner(NEW.pet_id) OR NEW.status <> 'pending'
   THEN RAISE EXCEPTION 'Only the pet owner can create pending invitations' USING ERRCODE='42501'; END IF;
 ELSE
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.pet_id IS DISTINCT FROM OLD.pet_id OR
     NEW.invited_by IS DISTINCT FROM OLD.invited_by OR NEW.invited_user_id IS DISTINCT FROM OLD.invited_user_id OR
     NEW.email IS DISTINCT FROM OLD.email OR NEW.created_at IS DISTINCT FROM OLD.created_at
   THEN RAISE EXCEPTION 'Invitation identity cannot be changed' USING ERRCODE='42501'; END IF;
  IF auth.uid() IS DISTINCT FROM OLD.invited_by AND NEW.permissions IS DISTINCT FROM OLD.permissions
   THEN RAISE EXCEPTION 'Only the inviter can set permissions' USING ERRCODE='42501'; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
   IF OLD.status <> 'pending' OR
      (auth.uid() IS DISTINCT FROM OLD.invited_user_id AND NOT public.is_pet_owner(OLD.pet_id)) OR
      NEW.status NOT IN ('accepted','declined')
    THEN RAISE EXCEPTION 'Invitation cannot be reopened' USING ERRCODE='42501'; END IF;
   IF NEW.status = 'accepted' AND NOT EXISTS(SELECT 1 FROM public.pet_co_carers WHERE pet_id=OLD.pet_id AND user_id=OLD.invited_user_id)
    THEN RAISE EXCEPTION 'Accept the invitation through the membership transaction' USING ERRCODE='42501'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER co_care_invite_integrity BEFORE INSERT OR UPDATE ON public.co_carer_invites
 FOR EACH ROW EXECUTE FUNCTION public.guard_co_care_invite_integrity();

CREATE FUNCTION public.guard_co_care_membership_integrity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; invitation public.co_carer_invites;
BEGIN
 IF auth.role() = 'service_role' OR auth.role() IS NULL THEN RETURN NEW; END IF;
 SELECT owner_id INTO owner FROM public.pets WHERE id=NEW.pet_id;
 IF TG_OP = 'UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.pet_id IS DISTINCT FROM OLD.pet_id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.invited_by IS DISTINCT FROM OLD.invited_by)
  THEN RAISE EXCEPTION 'Membership identity cannot be changed' USING ERRCODE='42501'; END IF;
 IF NOT public.account_has_verified_pro(owner) OR (TG_OP='INSERT' AND NOT public.account_has_verified_pro(NEW.user_id))
  THEN RAISE EXCEPTION 'Both accounts need Crittr Pro to share care' USING ERRCODE='42501'; END IF;
 IF auth.uid() = owner THEN
  IF TG_OP = 'INSERT' THEN NEW.invited_by := owner; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP <> 'INSERT' OR auth.uid() IS DISTINCT FROM NEW.user_id
  THEN RAISE EXCEPTION 'Only the pet owner can change permissions' USING ERRCODE='42501'; END IF;
 SELECT * INTO invitation FROM public.co_carer_invites
  WHERE pet_id=NEW.pet_id AND invited_user_id=auth.uid() AND invited_by=owner AND status='pending'
  ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'A pending owner invitation is required' USING ERRCODE='42501'; END IF;
 NEW.permissions := invitation.permissions;
 NEW.invited_by := owner;
 RETURN NEW;
END $$;
CREATE TRIGGER co_care_membership_integrity BEFORE INSERT OR UPDATE ON public.pet_co_carers
 FOR EACH ROW EXECUTE FUNCTION public.guard_co_care_membership_integrity();

CREATE FUNCTION public.consume_co_care_invitations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 UPDATE public.co_carer_invites SET status='accepted',responded_at=now()
  WHERE pet_id=NEW.pet_id AND invited_user_id=NEW.user_id AND invited_by=NEW.invited_by AND status='pending';
 RETURN NEW;
END $$;
CREATE TRIGGER co_care_consume_invitation AFTER INSERT ON public.pet_co_carers
 FOR EACH ROW EXECUTE FUNCTION public.consume_co_care_invitations();

CREATE OR REPLACE FUNCTION public.accept_co_care_invite(target_invite uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE invitation public.co_carer_invites; owner uuid;
BEGIN
 SELECT * INTO invitation FROM public.co_carer_invites WHERE id=target_invite AND invited_user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='42501'; END IF;
 SELECT owner_id INTO owner FROM public.pets WHERE id=invitation.pet_id;
 IF invitation.invited_by IS DISTINCT FROM owner OR NOT public.account_has_verified_pro(owner) OR NOT public.account_has_verified_pro(auth.uid())
  THEN RAISE EXCEPTION 'Both accounts need Crittr Pro to share care' USING ERRCODE='42501'; END IF;
 IF invitation.status='accepted' AND EXISTS(SELECT 1 FROM public.pet_co_carers WHERE pet_id=invitation.pet_id AND user_id=auth.uid() AND invited_by=owner)
  THEN RETURN invitation.pet_id; END IF;
 IF invitation.status <> 'pending' THEN RAISE EXCEPTION 'Invitation is no longer pending' USING ERRCODE='42501'; END IF;
 INSERT INTO public.pet_co_carers(pet_id,user_id,invited_by,permissions)
  VALUES(invitation.pet_id,auth.uid(),owner,invitation.permissions);
 RETURN invitation.pet_id;
END $$;
REVOKE ALL ON FUNCTION public.accept_co_care_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_co_care_invite(uuid) TO authenticated;


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

  IF public.account_has_verified_pro(v_invitee) THEN
    RETURN jsonb_build_object('ok', true, 'code', 'registered_pro');
  END IF;

  RETURN jsonb_build_object('ok', true, 'code', 'registered_needs_pro');
END;
$$;


CREATE OR REPLACE FUNCTION public.notify_on_co_carer_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  invite_id uuid;
  inviter_name text;
  pet_name text;
  target_has_pro boolean;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;
  IF NEW.invited_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.invited_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  target_user := NEW.invited_user_id;
  invite_id := NEW.id;

  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = target_user
      AND n.type IN ('co_care_invite', 'co_care_invite_requires_pro')
      AND (n.data->>'invite_id')::uuid = invite_id
  ) THEN
    RETURN NEW;
  END IF;

  SET LOCAL row_security TO off;

  SELECT COALESCE(
    NULLIF(TRIM(BOTH FROM concat_ws(' ', p.first_name, p.last_name)), ''),
    'Someone'
  )
  INTO inviter_name
  FROM public.profiles p
  WHERE p.id = NEW.invited_by;

  SELECT COALESCE(pt.name, 'their pet')
  INTO pet_name
  FROM public.pets pt
  WHERE pt.id = NEW.pet_id;

  SELECT public.account_has_verified_pro(target_user) INTO target_has_pro;

  IF target_has_pro THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      target_user,
      'co_care_invite',
      'Co-care invitation',
      COALESCE(inviter_name, 'Someone') || ' invited you to co-care for ' || COALESCE(pet_name, 'their pet') || '.',
      jsonb_build_object('pet_id', NEW.pet_id, 'invite_id', invite_id)
    );
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      target_user,
      'co_care_invite_requires_pro',
      'Co-care invitation',
      COALESCE(inviter_name, 'Someone') || ' invited you to co-care for ' || COALESCE(pet_name, 'their pet') || '. Upgrade to Crittr Pro to accept — tap here.',
      jsonb_build_object(
        'pet_id', NEW.pet_id,
        'invite_id', invite_id,
        'href', '/(logged-in)/upgrade'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.notify_co_carer_invite_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inviter_name text;
  pet_name text;
  target_has_pro boolean;
BEGIN
  IF NEW.invited_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = NEW.invited_user_id
      AND n.type IN ('co_care_invite', 'co_care_invite_requires_pro')
      AND (n.data->>'invite_id')::uuid = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    NULLIF(TRIM(BOTH FROM concat_ws(' ', p.first_name, p.last_name)), ''),
    'Someone'
  )
  INTO inviter_name
  FROM public.profiles p
  WHERE p.id = NEW.invited_by;

  SELECT COALESCE(pt.name, 'their pet')
  INTO pet_name
  FROM public.pets pt
  WHERE pt.id = NEW.pet_id;

  SELECT public.account_has_verified_pro(NEW.invited_user_id) INTO target_has_pro;

  BEGIN
    SET LOCAL row_security TO off;

    IF target_has_pro THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.invited_user_id,
        'co_care_invite',
        'Co-care invitation',
        COALESCE(inviter_name, 'Someone') || ' invited you to co-care for ' || COALESCE(pet_name, 'their pet') || '.',
        jsonb_build_object('pet_id', NEW.pet_id, 'invite_id', NEW.id)
      );
    ELSE
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.invited_user_id,
        'co_care_invite_requires_pro',
        'Co-care invitation',
        COALESCE(inviter_name, 'Someone') || ' invited you to co-care for ' || COALESCE(pet_name, 'their pet') || '. Upgrade to Crittr Pro to accept — tap here.',
        jsonb_build_object(
          'pet_id', NEW.pet_id,
          'invite_id', NEW.id,
          'href', '/(logged-in)/upgrade'
        )
      );
    END IF;
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE WARNING 'notify_co_carer_invite_after_insert: skipped (FK) invite_id=%', NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING 'notify_co_carer_invite_after_insert: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.promote_co_care_invite_notifications_on_pro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  should_promote boolean;
BEGIN
  should_promote := public.account_has_verified_pro(NEW.id);

  IF NOT should_promote THEN
    RETURN NEW;
  END IF;

  SET LOCAL row_security TO off;

  UPDATE public.notifications n
  SET
    type = 'co_care_invite',
    body = format(
      '%s invited you to co-care for %s.',
      COALESCE(
        NULLIF(trim(concat_ws(' ', pf.first_name, pf.last_name)), ''),
        'Someone'
      ),
      COALESCE(pt.name, 'their pet')
    ),
    data = n.data - 'href',
    read = false
  FROM public.co_carer_invites ci
  LEFT JOIN public.profiles pf ON pf.id = ci.invited_by
  LEFT JOIN public.pets pt ON pt.id = ci.pet_id
  WHERE n.user_id = NEW.id
    AND n.type = 'co_care_invite_requires_pro'
    AND ci.id = (n.data->>'invite_id')::uuid
    AND ci.status = 'pending'
    AND ci.invited_user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER trg_promote_co_care_invites_on_pro_upd ON public.profiles;
CREATE TRIGGER trg_promote_co_care_invites_on_pro_upd
 AFTER UPDATE OF crittr_pro_active,crittr_pro_until,crittr_pro_last_synced_at,subscription_environment ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.promote_co_care_invite_notifications_on_pro();
