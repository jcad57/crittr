-- The shared push worker also handles co-care invitations (including Free
-- invitees). A delayed job must not send an invite already answered or revoked.
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
      AND (n.type NOT IN ('co_care_invite', 'co_care_invite_requires_pro') OR EXISTS (
        SELECT 1 FROM public.co_carer_invites i
        JOIN public.pets pet ON pet.id = i.pet_id
        WHERE i.id::text = n.data->>'invite_id'
          AND i.invited_user_id = n.user_id AND i.status = 'pending'
          AND i.invited_by = pet.owner_id
      ))
      AND (n.type <> 'co_carer_activity_logged' OR EXISTS (
        SELECT 1 FROM public.pets pet WHERE pet.id::text = n.data->>'pet_id'
          AND public.push_recipient_has_pet_access(pet.id, n.user_id)))
    FROM claimed d JOIN public.notifications n ON n.id = d.notification_id
    JOIN public.profiles p ON p.id = n.user_id;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_push_deliveries(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_push_deliveries(uuid) TO service_role;

-- The scheduled invitation worker must never claim unrelated inbox messages.
-- Keep a separate RPC so older activity senders keep their existing contract.
CREATE OR REPLACE FUNCTION public.claim_co_care_invite_push_deliveries()
RETURNS TABLE(id uuid, expo_push_token text, expo_ticket_id text, attempts integer,
  title text, body text, data jsonb, expired boolean, deliverable boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH candidates AS (
    SELECT d.id FROM public.notification_push_deliveries d
    JOIN public.notifications n ON n.id = d.notification_id
    WHERE n.type IN ('co_care_invite', 'co_care_invite_requires_pro')
      AND d.completed_at IS NULL AND d.next_attempt_at <= now()
      AND (d.locked_until IS NULL OR d.locked_until < now())
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
    EXISTS (SELECT 1 FROM public.user_expo_push_devices t
      WHERE t.expo_push_token = d.expo_push_token AND t.user_id = n.user_id)
      AND p.notify_co_care_activities
      AND EXISTS (
        SELECT 1 FROM public.co_carer_invites i
        JOIN public.pets pet ON pet.id = i.pet_id
        WHERE i.id::text = n.data->>'invite_id'
          AND i.invited_user_id = n.user_id AND i.status = 'pending'
          AND i.invited_by = pet.owner_id
      )
  FROM claimed d JOIN public.notifications n ON n.id = d.notification_id
  JOIN public.profiles p ON p.id = n.user_id;
$$;
REVOKE ALL ON FUNCTION public.claim_co_care_invite_push_deliveries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_co_care_invite_push_deliveries() TO service_role;
