-- Cat litter: maintenance activity type + per-pet litter cleaning schedule.

ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'maintenance';

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS litter_cleaning_period text;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS litter_cleanings_per_period integer;

ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_litter_cleaning_period_chk;

ALTER TABLE public.pets
  ADD CONSTRAINT pets_litter_cleaning_period_chk
  CHECK (
    litter_cleaning_period IS NULL
    OR litter_cleaning_period IN ('day', 'week', 'month')
  );

ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_litter_cleanings_per_period_chk;

ALTER TABLE public.pets
  ADD CONSTRAINT pets_litter_cleanings_per_period_chk
  CHECK (
    litter_cleanings_per_period IS NULL
    OR litter_cleanings_per_period >= 1
  );

COMMENT ON COLUMN public.pets.litter_cleaning_period IS
  'For cats: interval for litter box cleaning goals (day / week / month).';

COMMENT ON COLUMN public.pets.litter_cleanings_per_period IS
  'For cats: target cleanings per litter_cleaning_period.';

-- Co-carer notifications: label maintenance activities in push/in-app copy.
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
      WHEN 'maintenance' THEN 'litter box maintenance'
      ELSE 'an activity'
    END
    || ' for '
    || COALESCE(v_pet_name, 'your pet')
    || ': '
    || COALESCE(NEW.label, '');

  v_href := '/(logged-in)/manage-activity-item/' || NEW.id::text;

  BEGIN
    SET LOCAL row_security TO off;

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
