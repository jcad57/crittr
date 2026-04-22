-- Co-carer activity alerts: when someone logs exercise/food/med/potty/training (not vet-visit
-- mirror rows), notify the pet owner and other co-carers who keep `notify_co_care_activities`
-- enabled. In-app rows power the notifications inbox + Realtime; remote delivery uses
-- `user_expo_push_tokens` + edge function `push-co-carer-activity`.

-- ── 1. Last-known Expo push token per user (one device wins; sufficient for MVP) ──

CREATE TABLE IF NOT EXISTS public.user_expo_push_tokens (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_expo_push_tokens_updated
  ON public.user_expo_push_tokens (updated_at DESC);

ALTER TABLE public.user_expo_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own expo push token" ON public.user_expo_push_tokens;
CREATE POLICY "Users manage own expo push token"
  ON public.user_expo_push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_expo_push_tokens IS
  'Expo push token for remote co-care activity alerts; updated from the mobile app.';

-- ── 2. Trigger: insert notifications for owner + co-carers (except actor) ─────────

CREATE OR REPLACE FUNCTION public.notify_co_carers_on_activity_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pet_name text;
  v_owner_id uuid;
  v_actor_name text;
  v_body text;
  v_href text;
  v_pref boolean;
  r record;
BEGIN
  IF NEW.logged_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip scheduled vet-visit mirror rows (same as user-facing “activity log” noise).
  IF NEW.vet_visit_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT pt.name, pt.owner_id
  INTO v_pet_name, v_owner_id
  FROM public.pets pt
  WHERE pt.id = NEW.pet_id
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    NULLIF(TRIM(BOTH FROM concat_ws(' ', p.first_name, p.last_name)), ''),
    'Someone'
  )
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.logged_by;

  v_body :=
    COALESCE(v_actor_name, 'Someone')
    || ' logged '
    || CASE NEW.activity_type::text
      WHEN 'food' THEN CASE WHEN NEW.is_treat IS TRUE THEN 'a treat' ELSE 'a meal' END
      WHEN 'exercise' THEN 'exercise'
      WHEN 'medication' THEN 'a medication'
      WHEN 'potty' THEN 'potty'
      WHEN 'training' THEN 'training'
      WHEN 'vet_visit' THEN 'a vet visit'
      ELSE 'an activity'
    END
    || ' for '
    || COALESCE(v_pet_name, 'your pet')
    || ': '
    || COALESCE(NEW.label, '');

  v_href := '/(logged-in)/manage-activity-item/' || NEW.id::text;

  BEGIN
    SET LOCAL row_security TO off;

    -- Primary owner (if they didn’t log it)
    IF v_owner_id IS DISTINCT FROM NEW.logged_by THEN
      SELECT COALESCE(pr.notify_co_care_activities, true)
      INTO v_pref
      FROM public.profiles pr
      WHERE pr.id = v_owner_id;

      IF v_pref THEN
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
          v_owner_id,
          'co_carer_activity_logged',
          COALESCE(v_pet_name, 'Pet') || ': activity logged',
          v_body,
          jsonb_build_object(
            'pet_id', NEW.pet_id,
            'activity_id', NEW.id,
            'href', v_href
          )
        );
      END IF;
    END IF;

    -- Other co-carers
    FOR r IN
      SELECT pc.user_id AS uid
      FROM public.pet_co_carers pc
      WHERE pc.pet_id = NEW.pet_id
        AND pc.user_id IS DISTINCT FROM NEW.logged_by
    LOOP
      SELECT COALESCE(pr.notify_co_care_activities, true)
      INTO v_pref
      FROM public.profiles pr
      WHERE pr.id = r.uid;

      IF v_pref THEN
        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
          r.uid,
          'co_carer_activity_logged',
          COALESCE(v_pet_name, 'Pet') || ': activity logged',
          v_body,
          jsonb_build_object(
            'pet_id', NEW.pet_id,
            'activity_id', NEW.id,
            'href', v_href
          )
        );
      END IF;
    END LOOP;

  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE WARNING 'notify_co_carers_on_activity_insert: skipped (FK) activity_id=%', NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING 'notify_co_carers_on_activity_insert: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pet_activities_notify_co_carers ON public.pet_activities;
CREATE TRIGGER trg_pet_activities_notify_co_carers
  AFTER INSERT ON public.pet_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_co_carers_on_activity_insert();

COMMENT ON FUNCTION public.notify_co_carers_on_activity_insert() IS
  'Notifies pet owner and co-carers (excluding actor) when an activity is logged; respects profiles.notify_co_care_activities.';

COMMENT ON COLUMN public.profiles.notify_co_care_activities IS
  'When true: daily exercise nudge (~3pm local) when goals incomplete, plus co-carer activity alerts (in-app + Expo push). When false: none of the above.';
