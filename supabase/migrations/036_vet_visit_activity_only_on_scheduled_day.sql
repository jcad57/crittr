-- Vet visit ↔ activity mirror: do not create pet_activities when a visit is first
-- scheduled. Only UPDATE an existing mirror when the user edits the visit.
-- Rows for “today’s” visits are inserted from the app (see ensureTodayVetVisitMirrorActivities).

CREATE OR REPLACE FUNCTION public.sync_pet_vet_visit_to_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
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
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_pet_vet_visit_to_activity() IS
  'On pet_vet_visits UPDATE, sync fields into an existing pet_activities mirror row if present. INSERT does not create a row (client adds on the local scheduled day).';
