-- Crittr Pro: switch entitlement columns from Stripe to RevenueCat-driven IAP.
--
-- Behaviour preserved:
--   `profiles.crittr_pro_until` is still the single source of truth for Pro.
--   The trigger that prevents authenticated users from forging Pro fields is
--   updated so it now guards the RevenueCat columns instead of the dropped
--   Stripe ones; webhooks continue to update via service_role.
--
-- Removed: stripe_customer_id, stripe_subscription_id (no live Stripe subscribers).
-- Added:
--   revenuecat_app_user_id  — RevenueCat appUserID, almost always == auth.users.id.
--   subscription_store      — `app_store` | `play_store` | `promotional` | ...
--   original_purchase_id    — receipt-level identifier (best effort, display only).
--   subscription_will_renew — false when the user has cancelled but is still in
--                             the paid period; null when no active subscription.

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id text,
  ADD COLUMN IF NOT EXISTS subscription_store text,
  ADD COLUMN IF NOT EXISTS original_purchase_id text,
  ADD COLUMN IF NOT EXISTS subscription_will_renew boolean;

COMMENT ON COLUMN public.profiles.crittr_pro_until IS
  'Crittr Pro access valid until this time (exclusive of grace). NULL = no Pro. Set via service role (RevenueCat webhook, sync edge function, admin SQL).';

COMMENT ON COLUMN public.profiles.revenuecat_app_user_id IS
  'RevenueCat appUserID for this account. Maintained by the RevenueCat webhook and sync edge function. Should normally match auth.users.id.';

COMMENT ON COLUMN public.profiles.subscription_store IS
  'Store reported by RevenueCat for the active subscription (app_store, play_store, promotional, ...). NULL when no active subscription.';

COMMENT ON COLUMN public.profiles.original_purchase_id IS
  'Receipt-level identifier from the RevenueCat subscriber (best-effort, used for display).';

COMMENT ON COLUMN public.profiles.subscription_will_renew IS
  'True when auto-renew is on. False when the user has cancelled but is still inside the paid period. NULL when no active subscription.';

-- ── Fast lookups by RC app user id (rare admin queries) ─────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat_app_user_id
  ON public.profiles (revenuecat_app_user_id)
  WHERE revenuecat_app_user_id IS NOT NULL;

-- ── Trigger: guard Pro / IAP fields against tampering by authenticated users ─
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
    NEW.revenuecat_app_user_id := NULL;
    NEW.subscription_store := NULL;
    NEW.original_purchase_id := NULL;
    NEW.subscription_will_renew := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (SELECT auth.role()) = 'authenticated' THEN
    NEW.crittr_pro_until := OLD.crittr_pro_until;
    NEW.revenuecat_app_user_id := OLD.revenuecat_app_user_id;
    NEW.subscription_store := OLD.subscription_store;
    NEW.original_purchase_id := OLD.original_purchase_id;
    NEW.subscription_will_renew := OLD.subscription_will_renew;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-bind trigger so DROP/CREATE FUNCTION above is picked up.
DROP TRIGGER IF EXISTS profiles_guard_crittr_pro_fields ON public.profiles;
CREATE TRIGGER profiles_guard_crittr_pro_fields
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_crittr_pro_fields();
