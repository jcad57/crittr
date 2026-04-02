-- Crittr Pro: entitlement on profiles + helper for queries / future RLS / Stripe webhooks.
-- Pro is active when crittr_pro_until IS NOT NULL AND crittr_pro_until > now().

-- ── Columns (Stripe hooks later) ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crittr_pro_until timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

COMMENT ON COLUMN public.profiles.crittr_pro_until IS
  'Crittr Pro access valid until this time (exclusive of grace). NULL = no Pro. Set via service role (Stripe webhook, Edge, admin SQL).';

COMMENT ON COLUMN public.profiles.stripe_customer_id IS
  'Stripe Customer id (cus_...). Optional; set by billing integration.';

COMMENT ON COLUMN public.profiles.stripe_subscription_id IS
  'Stripe Subscription id (sub_...). Optional; set by billing integration.';

-- ── Fast lookups: users with currently active Pro ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_crittr_pro_active
  ON public.profiles (crittr_pro_until)
  WHERE crittr_pro_until IS NOT NULL;

-- ── SQL helper: single boolean for app / policies / reports ───────────────────
CREATE OR REPLACE FUNCTION public.user_has_crittr_pro(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.crittr_pro_until IS NOT NULL
         AND p.crittr_pro_until > now()
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
  'True when profiles.crittr_pro_until is set and still in the future.';

REVOKE ALL ON FUNCTION public.user_has_crittr_pro(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_crittr_pro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_crittr_pro(uuid) TO service_role;

-- ── Prevent authenticated users from forging Pro fields (webhooks use service_role) ──
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
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (SELECT auth.role()) = 'authenticated' THEN
    NEW.crittr_pro_until := OLD.crittr_pro_until;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_crittr_pro_fields ON public.profiles;
CREATE TRIGGER profiles_guard_crittr_pro_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_crittr_pro_fields();

/*
  Example queries (run in SQL editor or via RPC):

  -- Current session: am I Pro?
  SELECT public.user_has_crittr_pro();

  -- Explicit user id (e.g. server-side):
  SELECT public.user_has_crittr_pro('uuid-here');

  -- Raw row (client already loads profile):
  SELECT
    crittr_pro_until,
    (crittr_pro_until IS NOT NULL AND crittr_pro_until > now()) AS is_crittr_pro
  FROM public.profiles
  WHERE id = auth.uid();

  -- All users with active Pro (admin / analytics):
  SELECT id, crittr_pro_until, stripe_customer_id
  FROM public.profiles
  WHERE crittr_pro_until IS NOT NULL
    AND crittr_pro_until > now();
*/
