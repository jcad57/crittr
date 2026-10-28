-- Retain the legacy one-token-per-account table for older app versions.
-- New clients and workers use one row per device, with a single current owner.
CREATE TABLE IF NOT EXISTS public.user_expo_push_devices (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_expo_push_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_devices_own_select ON public.user_expo_push_devices;
CREATE POLICY push_devices_own_select ON public.user_expo_push_devices FOR SELECT TO authenticated USING(auth.uid() = user_id);
DROP POLICY IF EXISTS push_devices_own_delete ON public.user_expo_push_devices;
CREATE POLICY push_devices_own_delete ON public.user_expo_push_devices FOR DELETE TO authenticated USING(auth.uid() = user_id);
GRANT SELECT, DELETE ON public.user_expo_push_devices TO authenticated;
GRANT ALL ON public.user_expo_push_devices TO service_role;
INSERT INTO public.user_expo_push_devices(user_id, expo_push_token, updated_at)
  SELECT DISTINCT ON (expo_push_token) user_id, expo_push_token, updated_at
  FROM public.user_expo_push_tokens ORDER BY expo_push_token, updated_at DESC, user_id
  ON CONFLICT(expo_push_token) DO NOTHING;

CREATE OR REPLACE FUNCTION public.mirror_legacy_push_token() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_expo_push_devices(user_id, expo_push_token, updated_at)
    VALUES(NEW.user_id, NEW.expo_push_token, NEW.updated_at)
    ON CONFLICT(expo_push_token) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS mirror_legacy_push_token ON public.user_expo_push_tokens;
CREATE TRIGGER mirror_legacy_push_token AFTER INSERT OR UPDATE ON public.user_expo_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.mirror_legacy_push_token();

CREATE OR REPLACE FUNCTION public.register_expo_push_token(p_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_token IS NULL OR length(p_token) > 256 OR p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' THEN
    RAISE EXCEPTION 'Invalid notification registration' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_expo_push_tokens(user_id, expo_push_token, updated_at)
    VALUES(auth.uid(), p_token, now())
  ON CONFLICT(user_id) DO UPDATE SET expo_push_token = EXCLUDED.expo_push_token, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.register_expo_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_expo_push_token(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.notification_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  expo_ticket_id text,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, expo_push_token)
);
ALTER TABLE public.notification_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_push_deliveries FROM anon, authenticated;
GRANT ALL ON public.notification_push_deliveries TO service_role;
CREATE INDEX IF NOT EXISTS notification_push_deliveries_pending ON public.notification_push_deliveries(next_attempt_at)
  WHERE completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.enqueue_notification_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_push_deliveries(notification_id, expo_push_token)
    SELECT NEW.id, t.expo_push_token FROM public.user_expo_push_devices t
    JOIN public.profiles p ON p.id = t.user_id
    WHERE t.user_id = NEW.user_id
      AND p.notify_co_care_activities;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enqueue_notification_push ON public.notifications;
CREATE TRIGGER enqueue_notification_push AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_push();

-- Memberships are the existing source of shared-pet access. On deployments
-- with the new billing lease helper, also apply its stricter entitlement check.
-- Keep that call inside PL/pgSQL so older schemas never need to resolve it.
CREATE OR REPLACE FUNCTION public.push_recipient_has_pet_access(p_pet_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inviter uuid;
BEGIN
  IF EXISTS(SELECT 1 FROM public.pets WHERE id = p_pet_id AND owner_id = p_user_id) THEN RETURN true; END IF;
  SELECT invited_by INTO v_inviter FROM public.pet_co_carers
    WHERE pet_id = p_pet_id AND user_id = p_user_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF to_regprocedure('public.account_has_verified_pro(uuid)') IS NOT NULL THEN
    RETURN public.account_has_verified_pro(p_user_id) AND public.account_has_verified_pro(v_inviter);
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.push_recipient_has_pet_access(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.push_recipient_has_pet_access(uuid,uuid) TO service_role;

-- A client can wake the worker for its own newly logged activity. Only the service
-- role can claim work. Leases allow a scheduler to recover interrupted workers.
CREATE OR REPLACE FUNCTION public.claim_notification_push_deliveries(p_activity_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, expo_push_token text, expo_ticket_id text, attempts integer,
  title text, body text, data jsonb, expired boolean, deliverable boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH candidates AS (
    SELECT d.id FROM public.notification_push_deliveries d
    JOIN public.notifications n ON n.id = d.notification_id
    WHERE d.completed_at IS NULL AND d.next_attempt_at <= now()
      AND (d.locked_until IS NULL OR d.locked_until < now())
      AND (p_activity_id IS NULL OR n.data->>'activity_id' = p_activity_id::text)
    ORDER BY d.next_attempt_at, d.id LIMIT 50 FOR UPDATE OF d SKIP LOCKED
  ), claimed AS (
    UPDATE public.notification_push_deliveries d SET locked_until = now() + interval '5 minutes', attempts = d.attempts + 1
    FROM candidates c WHERE d.id = c.id RETURNING d.*
  )
  SELECT d.id, d.expo_push_token, d.expo_ticket_id, d.attempts, n.title,
    coalesce(n.body, 'You have a new Crittr notification.'),
    coalesce(n.data, '{}'::jsonb) || jsonb_build_object('notification_id', n.id, 'recipient_user_id', n.user_id,
      'href', coalesce(n.data->>'href', '/(logged-in)/notifications')),
    d.created_at < now() - interval '24 hours',
    EXISTS(SELECT 1 FROM public.user_expo_push_devices t WHERE t.expo_push_token = d.expo_push_token AND t.user_id = n.user_id)
      AND p.notify_co_care_activities
      AND (n.type <> 'co_carer_activity_logged' OR EXISTS(
        SELECT 1 FROM public.pets pet WHERE pet.id::text = n.data->>'pet_id'
          AND public.push_recipient_has_pet_access(pet.id, n.user_id)))
    FROM claimed d JOIN public.notifications n ON n.id = d.notification_id
    JOIN public.profiles p ON p.id = n.user_id;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_push_deliveries(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_push_deliveries(uuid) TO service_role;
