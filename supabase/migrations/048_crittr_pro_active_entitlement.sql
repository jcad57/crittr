-- Crittr Pro entitlement mirror: RevenueCat `crittr_pro` is canonical.
--
-- Access is `profiles.crittr_pro_active`, not `crittr_pro_until`.
-- `crittr_pro_until` remains expiration metadata:
--   active + future until  → paid period still running
--   active + null until    → lifetime / promotional grant (no expiration)
--   inactive               → no Pro, regardless of until
--
-- Existing paying users are backfilled from `crittr_pro_until > now()` so
-- this migration cannot drop access for current subscribers. Lifetime grants
-- that never wrote `crittr_pro_until` are reconciled on the next webhook /
-- client sync against RevenueCat.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crittr_pro_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crittr_pro_product_id text,
  ADD COLUMN IF NOT EXISTS crittr_pro_ownership_type text,
  ADD COLUMN IF NOT EXISTS crittr_pro_last_synced_at timestamptz;

COMMENT ON COLUMN public.profiles.crittr_pro_active IS
  'Server-side mirror of RevenueCat entitlement crittr_pro. True when the entitlement is currently active, including lifetime grants with no expiration. Written only by service_role (RevenueCat webhook / sync edge function). This is the access flag.';

COMMENT ON COLUMN public.profiles.crittr_pro_until IS
  'Expiration metadata for the mirrored crittr_pro entitlement. NULL with crittr_pro_active=true means lifetime / no expiration. Must not be used on its own to grant or revoke Pro.';

COMMENT ON COLUMN public.profiles.crittr_pro_product_id IS
  'Store / promotional product identifier that currently unlocks crittr_pro (best-effort).';

COMMENT ON COLUMN public.profiles.crittr_pro_ownership_type IS
  'RevenueCat ownership type: PURCHASED, FAMILY_SHARED, or UNKNOWN.';

COMMENT ON COLUMN public.profiles.crittr_pro_last_synced_at IS
  'When the RevenueCat webhook or sync edge function last wrote the entitlement mirror.';

-- Preserve current subscribers (until still in the future).
UPDATE public.profiles
SET crittr_pro_active = true
WHERE crittr_pro_active IS NOT TRUE
  AND crittr_pro_until IS NOT NULL
  AND crittr_pro_until > now();

CREATE INDEX IF NOT EXISTS idx_profiles_crittr_pro_active_flag
  ON public.profiles (id)
  WHERE crittr_pro_active IS TRUE;

-- ── SQL helper: single boolean for app / policies / Edge Functions ───────────
CREATE OR REPLACE FUNCTION public.user_has_crittr_pro(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.crittr_pro_active IS TRUE
      FROM public.profiles p
      WHERE p.id = check_user_id
        AND (
          check_user_id = auth.uid()
          OR (SELECT auth.role()) = 'service_role'
        )
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.user_has_crittr_pro(uuid) IS
  'True when the synced RevenueCat crittr_pro entitlement is active (profiles.crittr_pro_active). Lifetime grants (null expiration) are included. Canceled-but-unexpired subscriptions remain true until RevenueCat reports the entitlement inactive.';

-- ── Guard Pro / IAP fields against tampering by authenticated users ──────────
CREATE OR REPLACE FUNCTION public.profiles_guard_crittr_pro_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    NEW.crittr_pro_until := NULL;
    NEW.crittr_pro_active := false;
    NEW.crittr_pro_product_id := NULL;
    NEW.crittr_pro_ownership_type := NULL;
    NEW.crittr_pro_last_synced_at := NULL;
    NEW.revenuecat_app_user_id := NULL;
    NEW.subscription_store := NULL;
    NEW.original_purchase_id := NULL;
    NEW.subscription_will_renew := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (SELECT auth.role()) = 'authenticated' THEN
    NEW.crittr_pro_until := OLD.crittr_pro_until;
    NEW.crittr_pro_active := OLD.crittr_pro_active;
    NEW.crittr_pro_product_id := OLD.crittr_pro_product_id;
    NEW.crittr_pro_ownership_type := OLD.crittr_pro_ownership_type;
    NEW.crittr_pro_last_synced_at := OLD.crittr_pro_last_synced_at;
    NEW.revenuecat_app_user_id := OLD.revenuecat_app_user_id;
    NEW.subscription_store := OLD.subscription_store;
    NEW.original_purchase_id := OLD.original_purchase_id;
    NEW.subscription_will_renew := OLD.subscription_will_renew;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_crittr_pro_fields ON public.profiles;
CREATE TRIGGER profiles_guard_crittr_pro_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_crittr_pro_fields();

-- ── Co-care SQL that previously inlined `crittr_pro_until > now()` ───────────
-- Triggers run as SECURITY DEFINER and often cannot call user_has_crittr_pro()
-- for *other* users (that helper requires auth.uid() or service_role). Read
-- `crittr_pro_active` directly.

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
      AND p.crittr_pro_active IS TRUE
  ) THEN
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

  SELECT COALESCE(p.crittr_pro_active, false)
  INTO target_has_pro
  FROM public.profiles p
  WHERE p.id = target_user;

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

  SELECT COALESCE(pr.crittr_pro_active, false)
  INTO target_has_pro
  FROM public.profiles pr
  WHERE pr.id = NEW.invited_user_id;

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
  IF TG_OP = 'INSERT' THEN
    should_promote := NEW.crittr_pro_active IS TRUE;
  ELSIF TG_OP = 'UPDATE' THEN
    should_promote :=
      NEW.crittr_pro_active IS TRUE
      AND OLD.crittr_pro_active IS DISTINCT FROM TRUE;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

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

DROP TRIGGER IF EXISTS trg_promote_co_care_invites_on_pro_ins ON public.profiles;
CREATE TRIGGER trg_promote_co_care_invites_on_pro_ins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_co_care_invite_notifications_on_pro();

DROP TRIGGER IF EXISTS trg_promote_co_care_invites_on_pro_upd ON public.profiles;
CREATE TRIGGER trg_promote_co_care_invites_on_pro_upd
  AFTER UPDATE OF crittr_pro_active ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_co_care_invite_notifications_on_pro();
