-- Scoped production installer for docs/subscription-architecture.md.
-- Includes billing metadata/guards, verified authorization, reconciliation and
-- webhook bookkeeping, and profile Realtime only. Does not modify pet rows,
-- pet/co-care policies, notifications, or unrelated pending migrations.
-- Safe to rerun and compatible with a later full subscription migration.
BEGIN;
SET LOCAL lock_timeout = '5s';

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

CREATE OR REPLACE FUNCTION public.user_has_crittr_pro(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT (check_user_id = auth.uid() OR auth.role() = 'service_role')
   AND public.account_has_verified_pro(check_user_id);
$$;

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


-- Fencing tokens prevent a slow/expired worker from overwriting a newer result.
CREATE TABLE IF NOT EXISTS public.billing_reconciliation (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 token uuid, started_at timestamptz, lease_until timestamptz
);
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
 id text PRIMARY KEY, event_type text NOT NULL, received_at timestamptz DEFAULT now(),
 completed_at timestamptz, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0
);
ALTER TABLE public.billing_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billing_reconciliation, public.billing_webhook_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.begin_billing_reconciliation(target uuid, minimum_interval integer DEFAULT 5)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed uuid;
BEGIN
 INSERT INTO public.billing_reconciliation(user_id) VALUES(target) ON CONFLICT DO NOTHING;
 UPDATE public.billing_reconciliation SET token = gen_random_uuid(), started_at = now(), lease_until = now() + interval '90 seconds'
 WHERE user_id = target AND (lease_until IS NULL OR lease_until < now())
 AND (started_at IS NULL OR started_at < now() - make_interval(secs => greatest(0, minimum_interval)))
 RETURNING token INTO claimed;
 RETURN claimed;
END $$;
CREATE OR REPLACE FUNCTION public.commit_billing_reconciliation(target uuid, fence uuid, snapshot jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_until timestamptz;
BEGIN
 PERFORM 1 FROM public.billing_reconciliation WHERE user_id = target AND token = fence AND lease_until > now() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Lock grant changes against this reconciliation before projecting either source.
 PERFORM 1 FROM public.profiles WHERE id=target FOR UPDATE;
 SELECT expires_at INTO admin_until FROM public.billing_admin_grants WHERE user_id=target AND expires_at>now();
 IF admin_until IS NOT NULL AND (
   coalesce((snapshot->>'isActive')::boolean,false) IS NOT TRUE OR
   (snapshot->>'crittrProUntil')::timestamptz < admin_until
 ) THEN
  snapshot := jsonb_build_object('isActive',true,'crittrProUntil',admin_until,'environment','admin',
    'store','promotional','productIdentifier','admin_grant','ownershipType','ADMIN_GRANTED','willRenew',false);
 END IF;
 UPDATE public.profiles SET
   crittr_pro_active = coalesce((snapshot->>'isActive')::boolean,false),
   crittr_pro_ownership_type = snapshot->>'ownershipType',
   crittr_pro_until = (snapshot->>'crittrProUntil')::timestamptz,
   revenuecat_app_user_id = target::text,
   subscription_store = snapshot->>'store',
   subscription_environment = snapshot->>'environment',
   crittr_pro_product_id = snapshot->>'productIdentifier',
   subscription_will_renew = (snapshot->>'willRenew')::boolean,
   original_purchase_id = snapshot->>'originalPurchaseId',
   crittr_pro_last_synced_at = now()
 WHERE id = target;
 UPDATE public.billing_reconciliation SET lease_until = NULL WHERE user_id = target;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION public.release_billing_reconciliation(target uuid, fence uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 UPDATE public.billing_reconciliation SET lease_until = NULL WHERE user_id = target AND token = fence;
$$;
CREATE OR REPLACE FUNCTION public.claim_billing_webhook(event_id text, kind text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.billing_webhook_events(id,event_type) VALUES(event_id,kind) ON CONFLICT DO NOTHING;
 UPDATE public.billing_webhook_events SET lease_until = now() + interval '5 minutes', attempts = attempts + 1
 WHERE id = event_id AND completed_at IS NULL AND (lease_until IS NULL OR lease_until < now());
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.begin_billing_reconciliation(uuid,integer), public.commit_billing_reconciliation(uuid,uuid,jsonb), public.release_billing_reconciliation(uuid,uuid), public.claim_billing_webhook(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_billing_reconciliation(uuid,integer), public.commit_billing_reconciliation(uuid,uuid,jsonb), public.release_billing_reconciliation(uuid,uuid), public.claim_billing_webhook(text,text) TO service_role;


GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_test_accounts,
 public.billing_admin_grants, public.billing_reconciliation, public.billing_webhook_events TO service_role;
REVOKE ALL ON FUNCTION public.user_has_crittr_pro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_crittr_pro(uuid) TO authenticated, service_role;

-- Dashboard grants/revocations reach a signed-in app through its verified
-- profile. Existing profiles SELECT RLS still controls which rows are visible.
-- Safe to apply before or after the broader subscription reliability rollout.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public' AND tablename = 'profiles'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
