-- Run after deploying dispatch-notification-pushes and saving matching secrets:
-- Edge Functions secret PUSH_DISPATCH_AUTH
-- Vault secret crittr_push_dispatch_auth
-- Both values must be the same random server-only secret.
-- The dispatcher processes due care reminders and queued co-care updates.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'crittr_push_dispatch_auth') THEN
    RAISE EXCEPTION 'Create Vault secret crittr_push_dispatch_auth first, matching Edge Function secret PUSH_DISPATCH_AUTH';
  END IF;
END $$;

-- Scheduling the same named job again updates it rather than adding a duplicate.
SELECT cron.schedule('crittr-notification-push-dispatch', '* * * * *', $job$
  SELECT net.http_post(
    url := 'https://slnmfelxigtlrdyogsjn.supabase.co/functions/v1/dispatch-notification-pushes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'crittr_push_dispatch_auth' LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

SELECT jobname, schedule, active FROM cron.job
WHERE jobname = 'crittr-notification-push-dispatch';
