-- Training activity type + link scheduled vet visits to pet_activities for the activity feed.

-- ── 1. Extend activity enum ─────────────────────────────────────────────────
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'training';

-- ── 2. Link activities to scheduled vet visits (one row per visit) ─────────
ALTER TABLE public.pet_activities
  ADD COLUMN IF NOT EXISTS vet_visit_id uuid
    REFERENCES public.pet_vet_visits (id) ON DELETE CASCADE;

COMMENT ON COLUMN public.pet_activities.vet_visit_id IS
  'When set, this activity mirrors public.pet_vet_visits; kept in sync by trigger.';

CREATE UNIQUE INDEX IF NOT EXISTS pet_activities_vet_visit_id_key
  ON public.pet_activities (vet_visit_id)
  WHERE vet_visit_id IS NOT NULL;

-- ── 3. Trigger: upsert activity when a vet visit is scheduled or edited ────
CREATE OR REPLACE FUNCTION public.sync_pet_vet_visit_to_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_logged_by uuid;
  v_n int;
BEGIN
  v_logged_by := COALESCE(
    auth.uid(),
    (SELECT owner_id FROM public.pets WHERE id = NEW.pet_id LIMIT 1)
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pet_activities (
      pet_id,
      logged_by,
      activity_type,
      label,
      logged_at,
      vet_location,
      notes,
      vet_visit_id
    ) VALUES (
      NEW.pet_id,
      v_logged_by,
      'vet_visit',
      NEW.title,
      NEW.visit_at,
      NEW.location,
      NEW.notes,
      NEW.id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE public.pet_activities
    SET
      pet_id = NEW.pet_id,
      label = NEW.title,
      logged_at = NEW.visit_at,
      vet_location = NEW.location,
      notes = NEW.notes
    WHERE vet_visit_id = NEW.id;
    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      INSERT INTO public.pet_activities (
        pet_id,
        logged_by,
        activity_type,
        label,
        logged_at,
        vet_location,
        notes,
        vet_visit_id
      ) VALUES (
        NEW.pet_id,
        v_logged_by,
        'vet_visit',
        NEW.title,
        NEW.visit_at,
        NEW.location,
        NEW.notes,
        NEW.id
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pet_vet_visits_sync_activity ON public.pet_vet_visits;
CREATE TRIGGER trg_pet_vet_visits_sync_activity
  AFTER INSERT OR UPDATE ON public.pet_vet_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pet_vet_visit_to_activity();

-- ── 4. Backfill activities for existing scheduled visits ────────────────────
INSERT INTO public.pet_activities (
  pet_id,
  logged_by,
  activity_type,
  label,
  logged_at,
  vet_location,
  notes,
  vet_visit_id
)
SELECT
  v.pet_id,
  p.owner_id,
  'vet_visit'::public.activity_type,
  v.title,
  v.visit_at,
  v.location,
  v.notes,
  v.id
FROM public.pet_vet_visits v
JOIN public.pets p ON p.id = v.pet_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.pet_activities a
  WHERE a.vet_visit_id = v.id
);
