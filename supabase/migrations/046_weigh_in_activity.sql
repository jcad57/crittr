-- Weigh-in activity: track pet weight changes through the activity log.
--
-- Adds a new `weigh_in` activity type plus dedicated weight columns on
-- pet_activities so the activity feed can render the recorded weight without
-- joining against pet_weight_entries. Each weigh-in activity is also linked
-- to the matching pet_weight_entries row via `weight_entry_id` so the two
-- stay in sync (delete-cascade keeps history graphs clean).

-- ── 1. Extend activity enum ────────────────────────────────────────────────
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'weigh_in';

-- ── 2. Add weight columns to pet_activities ────────────────────────────────
ALTER TABLE public.pet_activities
  ADD COLUMN IF NOT EXISTS weight_lbs numeric(8,2);

ALTER TABLE public.pet_activities
  ADD COLUMN IF NOT EXISTS weight_unit text;

ALTER TABLE public.pet_activities
  DROP CONSTRAINT IF EXISTS pet_activities_weight_unit_chk;

ALTER TABLE public.pet_activities
  ADD CONSTRAINT pet_activities_weight_unit_chk
  CHECK (
    weight_unit IS NULL
    OR weight_unit IN ('lbs', 'kg')
  );

ALTER TABLE public.pet_activities
  ADD COLUMN IF NOT EXISTS weight_entry_id uuid
    REFERENCES public.pet_weight_entries (id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS pet_activities_weight_entry_id_key
  ON public.pet_activities (weight_entry_id)
  WHERE weight_entry_id IS NOT NULL;

COMMENT ON COLUMN public.pet_activities.weight_lbs IS
  'For activity_type weigh_in: pet weight at the time of the entry (in the unit indicated by weight_unit).';
COMMENT ON COLUMN public.pet_activities.weight_unit IS
  'For activity_type weigh_in: lbs or kg. Mirrors pet_weight_entries.weight_unit.';
COMMENT ON COLUMN public.pet_activities.weight_entry_id IS
  'When set, this activity mirrors public.pet_weight_entries; deleting the entry deletes this row.';

-- ── 3. Co-carer notification trigger: label weigh-in events ────────────────
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
      WHEN 'weigh_in' THEN 'a weigh-in'
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
