-- Allow co-care invites to registered users who are not yet Pro; they get a
-- dedicated in-app notification with an upgrade CTA. Accept still requires Pro (RLS).

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

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_invitee
      AND p.crittr_pro_until IS NOT NULL
      AND p.crittr_pro_until > now()
  ) THEN
    RETURN jsonb_build_object('ok', true, 'code', 'registered_pro');
  END IF;

  RETURN jsonb_build_object('ok', true, 'code', 'registered_needs_pro');
END;
$$;

COMMENT ON FUNCTION public.validate_co_care_invite_send(uuid, text) IS
  'Validates co-care invite: caller owns pet and has Pro; invitee may be unregistered, Pro, or registered without Pro (latter still allowed — app sends upgrade nudge).';

-- Drop invitee Pro requirement on invite row insert; inviter Pro remains enforced.
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

  RETURN NEW;
END;
$$;

-- Backfill notification when invited_user_id is first set: match client behavior
-- (Pro → standard invite; non‑Pro → upgrade nudge).
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

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_user
      AND p.crittr_pro_until IS NOT NULL
      AND p.crittr_pro_until > now()
  )
  INTO target_has_pro;

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
