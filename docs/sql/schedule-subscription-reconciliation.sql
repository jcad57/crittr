-- Hosted Supabase only. Before running, provision the two named Vault secrets:
-- crittr_billing_project_url and crittr_billing_reconciliation_auth.
-- The latter must match the Edge Function's ENTITLEMENT_RECONCILE_AUTH.
-- This job uses a dedicated worker credential, never a public app key.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='crittr_billing_project_url')
     OR NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name='crittr_billing_reconciliation_auth') THEN
    RAISE EXCEPTION 'Provision the billing scheduler Vault secrets first';
  END IF;
END $$;

SELECT cron.schedule(
  'crittr-pro-reconciliation',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name='crittr_billing_project_url') || '/functions/v1/reconcile-crittr-pro-entitlements',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
          WHERE name='crittr_billing_reconciliation_auth')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $job$
);
COMMIT;
