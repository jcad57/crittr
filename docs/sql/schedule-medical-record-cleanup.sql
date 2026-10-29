-- Run after deploying cleanup-medical-record-storage and provisioning Vault:
-- crittr_medical_record_project_url = the project's https://...supabase.co URL
-- crittr_medical_record_cleanup_auth = Edge secret MEDICAL_RECORD_CLEANUP_AUTH
-- Use the same random server-only value in Vault and Edge Function secrets.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'crittr_medical_record_project_url')
      OR NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'crittr_medical_record_cleanup_auth') THEN
    RAISE EXCEPTION 'Provision the medical record cleanup Vault secrets first';
  END IF;
END $$;
SELECT cron.schedule('crittr-medical-record-cleanup', '*/5 * * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets
      WHERE name = 'crittr_medical_record_project_url' LIMIT 1) || '/functions/v1/cleanup-medical-record-storage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'crittr_medical_record_cleanup_auth' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);
COMMIT;
