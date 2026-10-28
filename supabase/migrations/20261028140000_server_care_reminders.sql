ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS care_time_zone text;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS care_time_zone text;
CREATE OR REPLACE FUNCTION public.valid_care_time_zone(p_zone text) RETURNS boolean
LANGUAGE sql STABLE SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_zone); $$;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.profiles'::regclass AND conname='valid_care_time_zone') THEN
    ALTER TABLE profiles ADD CONSTRAINT valid_care_time_zone CHECK(care_time_zone IS NULL OR public.valid_care_time_zone(care_time_zone));
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.project_pet_care_time_zone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  SELECT care_time_zone INTO NEW.care_time_zone FROM profiles WHERE id=NEW.owner_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS project_pet_care_time_zone ON pets;
CREATE TRIGGER project_pet_care_time_zone BEFORE INSERT OR UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION public.project_pet_care_time_zone();
CREATE OR REPLACE FUNCTION public.project_owner_care_time_zone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE pets SET care_time_zone=NEW.care_time_zone WHERE owner_id=NEW.id AND care_time_zone IS DISTINCT FROM NEW.care_time_zone;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS project_owner_care_time_zone ON profiles;
CREATE TRIGGER project_owner_care_time_zone AFTER UPDATE OF care_time_zone ON profiles
  FOR EACH ROW WHEN(OLD.care_time_zone IS DISTINCT FROM NEW.care_time_zone) EXECUTE FUNCTION public.project_owner_care_time_zone();
UPDATE pets pet SET care_time_zone=p.care_time_zone FROM profiles p WHERE p.id=pet.owner_id AND pet.care_time_zone IS DISTINCT FROM p.care_time_zone;
ALTER TABLE public.user_expo_push_devices ADD COLUMN IF NOT EXISTS care_reminder_mode text NOT NULL DEFAULT 'local'
  CHECK (care_reminder_mode IN ('local','server'));
ALTER TABLE public.user_expo_push_devices ADD COLUMN IF NOT EXISTS care_reminders_enabled_at timestamptz;
UPDATE user_expo_push_devices SET care_reminders_enabled_at=now() WHERE care_reminder_mode='server' AND care_reminders_enabled_at IS NULL;
CREATE TABLE IF NOT EXISTS public.care_reminder_config(id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false,
  activity_queue_since timestamptz NOT NULL DEFAULT 'infinity');
INSERT INTO public.care_reminder_config(id,enabled) VALUES(true,false) ON CONFLICT DO NOTHING;
ALTER TABLE public.care_reminder_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.care_reminder_config FROM anon,authenticated;
GRANT ALL ON public.care_reminder_config TO service_role;

CREATE OR REPLACE FUNCTION public.initialize_care_time_zone(p_time_zone text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE updated_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=p_time_zone) THEN
    RAISE EXCEPTION 'A valid care time zone is required' USING ERRCODE='42501';
  END IF;
  -- A travel device or second phone must not silently move a shared pet's routine.
  UPDATE public.profiles SET care_time_zone=p_time_zone WHERE id=auth.uid() AND care_time_zone IS NULL;
  GET DIAGNOSTICS updated_count=ROW_COUNT;
  RETURN updated_count>0;
END $$;
REVOKE ALL ON FUNCTION public.initialize_care_time_zone(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.initialize_care_time_zone(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.care_reminder_status() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('enabled',coalesce((SELECT enabled FROM care_reminder_config WHERE id),false),
    'time_zone',(SELECT care_time_zone FROM profiles WHERE id=auth.uid()),
    'missing_owner_time_zones',(SELECT count(*) FROM pets pet JOIN profiles p ON p.id=pet.owner_id
      WHERE NOT pet.is_archived AND NOT pet.is_memorialized AND p.care_time_zone IS NULL
        AND (pet.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM pet_co_carers pc WHERE pc.pet_id=pet.id AND pc.user_id=auth.uid()))));
$$;
REVOKE ALL ON FUNCTION public.care_reminder_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.care_reminder_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_device_care_reminders(p_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT coalesce((SELECT enabled FROM care_reminder_config WHERE id),false) THEN
    RAISE EXCEPTION 'Server care reminders are awaiting activation' USING ERRCODE='42501';
  END IF;
  UPDATE user_expo_push_devices SET care_reminders_enabled_at=CASE WHEN care_reminder_mode='server'
      THEN coalesce(care_reminders_enabled_at,now()) ELSE now() END,
    care_reminder_mode='server' WHERE user_id=auth.uid() AND expo_push_token=p_token;
  IF NOT FOUND THEN RAISE EXCEPTION 'Register this device first'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.activate_device_care_reminders(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activate_device_care_reminders(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mirror_legacy_push_token() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO user_expo_push_devices(user_id,expo_push_token,updated_at)
    VALUES(NEW.user_id,NEW.expo_push_token,NEW.updated_at)
    ON CONFLICT(expo_push_token) DO UPDATE SET user_id=EXCLUDED.user_id,updated_at=EXCLUDED.updated_at,
      care_reminder_mode=CASE WHEN user_expo_push_devices.user_id=EXCLUDED.user_id THEN user_expo_push_devices.care_reminder_mode ELSE 'local' END,
      care_reminders_enabled_at=CASE WHEN user_expo_push_devices.user_id=EXCLUDED.user_id THEN user_expo_push_devices.care_reminders_enabled_at ELSE NULL END;
  RETURN NEW;
END $$;

CREATE TABLE IF NOT EXISTS public.care_reminder_occurrences(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pet_id uuid NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  local_date date NOT NULL, source_kind text NOT NULL, source_id text NOT NULL, source_slot text NOT NULL,
  reminder_key text NOT NULL, scheduled_at timestamptz NOT NULL, version text NOT NULL,
  category text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pet_id,local_date,source_kind,source_id,source_slot,reminder_key,scheduled_at)
);
ALTER TABLE care_reminder_occurrences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON care_reminder_occurrences FROM anon,authenticated;
GRANT ALL ON care_reminder_occurrences TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS care_reminder_notification_once ON notifications(user_id,(data->>'care_reminder_id'))
  WHERE type='care_task_due';

-- One consistent snapshot and fingerprint covers edits/deletions between planning
-- and sending, rather than trusting stale payloads from a mobile device.
CREATE OR REPLACE FUNCTION public.care_reminder_source_snapshot(p_pet_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('time_zone',profile.care_time_zone,
    'pet',to_jsonb(pet)||jsonb_build_object(
      'foods',coalesce((SELECT jsonb_agg(to_jsonb(f)||jsonb_build_object('pet_food_portions',coalesce(
        (SELECT jsonb_agg(to_jsonb(fp) ORDER BY fp.id) FROM pet_food_portions fp WHERE fp.pet_food_id=f.id),'[]'::jsonb)) ORDER BY f.id) FROM pet_foods f WHERE f.pet_id=pet.id),'[]'::jsonb),
      'medications',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.id) FROM pet_medications m WHERE m.pet_id=pet.id),'[]'::jsonb),
      'vaccinations',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM pet_vaccinations v WHERE v.pet_id=pet.id),'[]'::jsonb),
      'exercise',(SELECT to_jsonb(e) FROM pet_exercises e WHERE e.pet_id=pet.id LIMIT 1),
      'exercise_plans',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM pet_exercise_plans e WHERE e.pet_id=pet.id),'[]'::jsonb)),
    'vet_visits',coalesce((SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM pet_vet_visits v WHERE v.pet_id=pet.id),'[]'::jsonb))
  FROM pets pet JOIN profiles profile ON profile.id=pet.owner_id WHERE pet.id=p_pet_id;
$$;
REVOKE ALL ON FUNCTION public.care_reminder_source_snapshot(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.care_reminder_inputs(p_after uuid DEFAULT NULL,p_limit integer DEFAULT 100)
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT s.payload||jsonb_build_object('version',md5(s.payload::text)) FROM (
    SELECT public.care_reminder_source_snapshot(pet.id) payload FROM pets pet JOIN profiles profile ON profile.id=pet.owner_id
    WHERE NOT pet.is_archived AND NOT pet.is_memorialized AND profile.care_time_zone IS NOT NULL
      AND (p_after IS NULL OR pet.id>p_after) AND coalesce((SELECT enabled FROM care_reminder_config WHERE id),false)
      AND EXISTS(SELECT 1 FROM user_expo_push_devices d WHERE d.care_reminder_mode='server'
        AND (d.user_id=pet.owner_id OR EXISTS(SELECT 1 FROM pet_co_carers pc WHERE pc.pet_id=pet.id AND pc.user_id=d.user_id)))
    ORDER BY pet.id LIMIT greatest(1,least(p_limit,100))
  ) s;
$$;
REVOKE ALL ON FUNCTION public.care_reminder_inputs(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.care_reminder_inputs(uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.care_reminder_is_deliverable(p_id uuid,p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM care_reminder_occurrences o JOIN pets pet ON pet.id=o.pet_id
    JOIN profiles p ON p.id=p_user_id WHERE o.id=p_id AND NOT pet.is_archived AND NOT pet.is_memorialized
      AND coalesce((SELECT enabled FROM care_reminder_config WHERE id),false)
      AND public.push_recipient_has_pet_access(pet.id,p_user_id)
      AND o.scheduled_at<=now() AND o.scheduled_at>now()-interval '1 hour'
      AND md5(public.care_reminder_source_snapshot(pet.id)::text)=o.version
      AND CASE o.category WHEN 'notify_meals_treats' THEN p.notify_meals_treats
        WHEN 'notify_medications' THEN p.notify_medications WHEN 'notify_vet_visits' THEN p.notify_vet_visits
        WHEN 'notify_vaccinations' THEN p.notify_vaccinations WHEN 'notify_co_care_activities' THEN p.notify_co_care_activities ELSE false END
      AND NOT EXISTS(SELECT 1 FROM pet_schedule_items s WHERE s.pet_id=o.pet_id AND s.local_date=o.local_date
        AND s.source_kind=o.source_kind AND s.source_id=o.source_id AND s.source_slot=o.source_slot AND s.completed_at IS NOT NULL));
$$;
REVOKE ALL ON FUNCTION public.care_reminder_is_deliverable(uuid,uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_notification_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO notification_push_deliveries(notification_id,expo_push_token)
    SELECT NEW.id,t.expo_push_token FROM user_expo_push_devices t JOIN profiles p ON p.id=t.user_id
    WHERE t.user_id=NEW.user_id AND (CASE WHEN NEW.type='care_task_due' THEN
      t.care_reminder_mode='server' AND public.care_reminder_is_deliverable((NEW.data->>'care_reminder_id')::uuid,NEW.user_id)
      AND t.care_reminders_enabled_at<=(SELECT scheduled_at FROM care_reminder_occurrences WHERE id=(NEW.data->>'care_reminder_id')::uuid)
      ELSE p.notify_co_care_activities END)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.enqueue_due_care_reminders(p_pet_id uuid,p_version text,p_reminders jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; o care_reminder_occurrences; n notifications; recipient record; added integer:=0; previous_version text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_pet_id::text,58101));
  IF NOT coalesce((SELECT enabled FROM care_reminder_config WHERE id),false)
    OR md5(public.care_reminder_source_snapshot(p_pet_id)::text) IS DISTINCT FROM p_version THEN RETURN 0; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_reminders) LOOP
    IF (r->>'scheduled_at')::timestamptz>now() OR (r->>'scheduled_at')::timestamptz<=now()-interval '1 hour' THEN CONTINUE; END IF;
    IF EXISTS(SELECT 1 FROM pet_schedule_items s WHERE s.pet_id=p_pet_id AND s.local_date=(r->>'local_date')::date
      AND s.source_kind=r->>'source_kind' AND s.source_id=r->>'source_id' AND s.source_slot=r->>'source_slot' AND s.completed_at IS NOT NULL) THEN CONTINUE; END IF;
    SELECT version INTO previous_version FROM care_reminder_occurrences WHERE pet_id=p_pet_id
      AND local_date=(r->>'local_date')::date AND source_kind=r->>'source_kind' AND source_id=r->>'source_id'
      AND source_slot=r->>'source_slot' AND reminder_key=r->>'reminder_key' AND scheduled_at=(r->>'scheduled_at')::timestamptz;
    INSERT INTO care_reminder_occurrences(pet_id,local_date,source_kind,source_id,source_slot,reminder_key,scheduled_at,version,category)
      VALUES(p_pet_id,(r->>'local_date')::date,r->>'source_kind',r->>'source_id',r->>'source_slot',r->>'reminder_key',
        (r->>'scheduled_at')::timestamptz,p_version,r->>'category')
      ON CONFLICT(pet_id,local_date,source_kind,source_id,source_slot,reminder_key,scheduled_at)
      DO UPDATE SET version=EXCLUDED.version RETURNING * INTO o;
    FOR recipient IN SELECT DISTINCT d.user_id FROM user_expo_push_devices d JOIN pets pet ON pet.id=p_pet_id
      WHERE d.care_reminder_mode='server' AND d.care_reminders_enabled_at<=o.scheduled_at
        AND (d.user_id=pet.owner_id OR EXISTS(SELECT 1 FROM pet_co_carers pc WHERE pc.pet_id=pet.id AND pc.user_id=d.user_id))
        AND public.care_reminder_is_deliverable(o.id,d.user_id)
    LOOP
      INSERT INTO notifications(user_id,type,title,body,data)
        VALUES(recipient.user_id,'care_task_due',r->>'title',r->>'body',jsonb_build_object('care_reminder_id',o.id,
          'pet_id',p_pet_id,'type','care_task_due','category',o.category,'href',r->>'href'))
        ON CONFLICT(user_id,(data->>'care_reminder_id')) WHERE type='care_task_due'
        DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,data=EXCLUDED.data RETURNING * INTO n;
      INSERT INTO notification_push_deliveries(notification_id,expo_push_token)
        SELECT n.id,d.expo_push_token FROM user_expo_push_devices d WHERE d.user_id=recipient.user_id AND d.care_reminder_mode='server' AND d.care_reminders_enabled_at<=o.scheduled_at
        ON CONFLICT DO NOTHING;
      -- A source edit can invalidate a claimed payload before the next planner
      -- run. Refresh that skipped, unsent job without resending accepted tickets.
      IF previous_version IS NOT NULL AND previous_version IS DISTINCT FROM o.version THEN
        UPDATE notification_push_deliveries SET completed_at=NULL,locked_until=NULL,next_attempt_at=now(),last_error=NULL
          WHERE notification_id=n.id AND expo_ticket_id IS NULL AND completed_at IS NOT NULL
            AND last_error='Device or preference no longer eligible';
      END IF;
      added:=added+1;
    END LOOP;
  END LOOP;
  RETURN added;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_due_care_reminders(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_due_care_reminders(uuid,text,jsonb) TO service_role;

-- Replace the claim function with category/device/completion-aware eligibility.
CREATE OR REPLACE FUNCTION public.claim_notification_push_deliveries(p_activity_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,expo_push_token text,expo_ticket_id text,attempts integer,title text,body text,data jsonb,expired boolean,deliverable boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  WITH candidates AS (
    SELECT d.id FROM notification_push_deliveries d JOIN notifications n ON n.id=d.notification_id
    WHERE d.completed_at IS NULL AND d.next_attempt_at<=now() AND (d.locked_until IS NULL OR d.locked_until<now())
      AND (p_activity_id IS NULL OR n.data->>'activity_id'=p_activity_id::text)
      -- Historical activity alerts used a direct sender without queue tickets.
      -- Never replay those merely because the durable worker is being enabled.
      AND (n.type<>'co_carer_activity_logged' OR d.expo_ticket_id IS NOT NULL
        OR d.created_at<now()-interval '24 hours'
        OR n.created_at>=(SELECT activity_queue_since FROM care_reminder_config WHERE id))
    ORDER BY d.next_attempt_at,d.id LIMIT 100 FOR UPDATE OF d SKIP LOCKED
  ), claimed AS (
    UPDATE notification_push_deliveries d SET locked_until=now()+interval '5 minutes',attempts=d.attempts+1
      FROM candidates c WHERE d.id=c.id RETURNING d.*
  )
  SELECT d.id,d.expo_push_token,d.expo_ticket_id,d.attempts,n.title,coalesce(n.body,'You have a new Crittr notification.'),
    coalesce(n.data,'{}'::jsonb)||jsonb_build_object('type',n.type,'notification_id',n.id,'recipient_user_id',n.user_id,
      'href',coalesce(n.data->>'href','/(logged-in)/notifications'))
      || CASE WHEN o.id IS NOT NULL THEN jsonb_build_object('expires_at',o.scheduled_at+interval '1 hour') ELSE '{}'::jsonb END,
    CASE WHEN n.type='care_task_due' THEN coalesce(o.scheduled_at<now()-interval '1 hour',true) ELSE d.created_at<now()-interval '24 hours' END,
    EXISTS(SELECT 1 FROM user_expo_push_devices t WHERE t.expo_push_token=d.expo_push_token AND t.user_id=n.user_id
      AND (n.type<>'care_task_due' OR (t.care_reminder_mode='server' AND t.care_reminders_enabled_at<=o.scheduled_at)))
    AND CASE WHEN n.type='care_task_due' THEN public.care_reminder_is_deliverable(o.id,n.user_id)
    ELSE p.notify_co_care_activities
      AND (n.type NOT IN ('co_care_invite','co_care_invite_requires_pro') OR EXISTS(SELECT 1 FROM co_carer_invites i JOIN pets pet ON pet.id=i.pet_id
        WHERE i.id::text=n.data->>'invite_id' AND i.invited_user_id=n.user_id AND i.status='pending' AND i.invited_by=pet.owner_id))
      AND (n.type<>'co_carer_activity_logged' OR EXISTS(SELECT 1 FROM pets pet WHERE pet.id::text=n.data->>'pet_id'
        AND NOT pet.is_archived AND NOT pet.is_memorialized AND public.push_recipient_has_pet_access(pet.id,n.user_id)
        AND (EXISTS(SELECT 1 FROM pet_activities a WHERE a.id::text=n.data->>'activity_id' AND a.pet_id=pet.id)
          OR EXISTS(SELECT 1 FROM pet_schedule_items s WHERE s.id::text=n.data->>'schedule_item_id' AND s.pet_id=pet.id AND s.completed_at IS NOT NULL)))) END
    FROM claimed d JOIN notifications n ON n.id=d.notification_id JOIN profiles p ON p.id=n.user_id
      LEFT JOIN care_reminder_occurrences o ON o.id::text=n.data->>'care_reminder_id';
$$;
REVOKE ALL ON FUNCTION public.claim_notification_push_deliveries(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_push_deliveries(uuid) TO service_role;
