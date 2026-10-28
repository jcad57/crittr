-- Run this entire file in Supabase SQL Editor as postgres. Safe to rerun.
-- Installs only verified entitlement helpers and their protected metadata.
-- It does not change pet-access policies or automatically grant anyone Pro.
-- Production/sandbox access needs a real RevenueCat reconciliation; see
-- docs/push-notification-reliability.md. Do not manufacture verification dates.
BEGIN;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS crittr_pro_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_environment text,
  ADD COLUMN IF NOT EXISTS crittr_pro_product_id text;

CREATE TABLE IF NOT EXISTS public.billing_test_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE
);
ALTER TABLE public.billing_test_accounts ENABLE ROW LEVEL SECURITY;
-- Only trusted deployment/admin tooling may enroll sandbox testers (including App Review).
REVOKE ALL ON public.billing_test_accounts FROM anon, authenticated;

-- Explicit administrator grants are separate from store purchases and expire automatically.
CREATE TABLE IF NOT EXISTS public.billing_admin_grants (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 reason text NOT NULL CHECK (length(trim(reason)) > 0),
 granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_admin_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_admin_grants FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.project_billing_admin_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE target_id uuid := coalesce(NEW.user_id, OLD.user_id);
BEGIN
 IF TG_OP <> 'DELETE' AND NEW.expires_at > now() THEN
  UPDATE public.profiles SET crittr_pro_active=true,crittr_pro_until=NEW.expires_at,
   subscription_environment='admin',subscription_store='promotional',
   crittr_pro_product_id='admin_grant',subscription_will_renew=false,
   crittr_pro_ownership_type='ADMIN_GRANTED',crittr_pro_last_synced_at=now()
  WHERE id=target_id;
 ELSE
  UPDATE public.profiles SET crittr_pro_active=false,crittr_pro_until=NULL,
   subscription_environment=NULL,crittr_pro_last_synced_at=now()
  WHERE id=target_id AND subscription_environment='admin';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DROP TRIGGER IF EXISTS billing_admin_grant_projection ON public.billing_admin_grants;
CREATE TRIGGER billing_admin_grant_projection AFTER INSERT OR UPDATE OR DELETE ON public.billing_admin_grants
 FOR EACH ROW EXECUTE FUNCTION public.project_billing_admin_grant();
CREATE OR REPLACE FUNCTION public.set_crittr_pro_admin_grant(target uuid, expires_at timestamptz, reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF expires_at <= now() OR expires_at > now() + interval '90 days' OR expires_at IS NULL THEN
  RAISE EXCEPTION 'Admin grants must expire within the next 90 days';
 END IF;
 INSERT INTO public.billing_admin_grants(user_id,expires_at,reason) VALUES(target,expires_at,reason)
 ON CONFLICT(user_id) DO UPDATE SET expires_at=EXCLUDED.expires_at,reason=EXCLUDED.reason,granted_at=now();
END $$;
REVOKE ALL ON FUNCTION public.set_crittr_pro_admin_grant(uuid,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_crittr_pro_admin_grant(uuid,timestamptz,text) TO service_role;

CREATE OR REPLACE FUNCTION public.account_has_verified_pro(target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = target
    AND p.crittr_pro_active IS TRUE AND (p.crittr_pro_until IS NULL OR p.crittr_pro_until > now())
    AND (p.crittr_pro_last_synced_at > now() - interval '72 hours' OR p.subscription_environment='admin')
    AND ((p.subscription_environment='admin' AND EXISTS (SELECT 1 FROM public.billing_admin_grants g WHERE g.user_id=target AND g.expires_at>now())) OR p.subscription_environment IN ('production','promotional') OR
      (p.subscription_environment = 'sandbox' AND EXISTS
       (SELECT 1 FROM public.billing_test_accounts t WHERE t.user_id = target))));
$$;
REVOKE ALL ON FUNCTION public.account_has_verified_pro(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_has_verified_pro(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.profiles_guard_crittr_pro_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.role() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.crittr_pro_active := false; NEW.crittr_pro_ownership_type := NULL; NEW.crittr_pro_until := NULL; NEW.revenuecat_app_user_id := NULL;
    NEW.subscription_store := NULL; NEW.original_purchase_id := NULL;
    NEW.subscription_will_renew := NULL; NEW.crittr_pro_last_synced_at := NULL;
    NEW.subscription_environment := NULL; NEW.crittr_pro_product_id := NULL;
  ELSE
    NEW.crittr_pro_active := OLD.crittr_pro_active; NEW.crittr_pro_ownership_type := OLD.crittr_pro_ownership_type; NEW.crittr_pro_until := OLD.crittr_pro_until;
    NEW.revenuecat_app_user_id := OLD.revenuecat_app_user_id;
    NEW.subscription_store := OLD.subscription_store;
    NEW.original_purchase_id := OLD.original_purchase_id;
    NEW.subscription_will_renew := OLD.subscription_will_renew;
    NEW.crittr_pro_last_synced_at := OLD.crittr_pro_last_synced_at;
    NEW.subscription_environment := OLD.subscription_environment;
    NEW.crittr_pro_product_id := OLD.crittr_pro_product_id;
  END IF;
  RETURN NEW;
END $$;


GRANT ALL ON public.billing_test_accounts, public.billing_admin_grants TO service_role;
COMMIT;

-- Confirms installation without exposing account details.
SELECT to_regprocedure('public.account_has_verified_pro(uuid)') AS installed_helper;
SELECT subscription_environment, count(*) AS account_count,
  count(*) FILTER (WHERE public.account_has_verified_pro(id)) AS verified_pro_count
FROM public.profiles GROUP BY subscription_environment;
