-- Repair deployments where save_pet_weigh_in references the newer
-- pet_is_writable helper before that helper has been installed. Keep the
-- existing pet permission check and honor the write guard whenever present.
-- Replaces only the function; existing weights and activities are untouched.
CREATE OR REPLACE FUNCTION public.save_pet_weigh_in(
  p_pet_id uuid, p_recorded_at date, p_logged_at timestamptz,
  p_weight numeric, p_unit text, p_label text, p_notes text,
  p_replace_existing boolean DEFAULT false, p_activity_id uuid DEFAULT NULL
) RETURNS public.pet_activities
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_entry public.pet_weight_entries;
  v_source public.pet_activities;
  v_activity public.pet_activities;
  v_latest public.pet_weight_entries;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_pet_permission(p_pet_id, 'can_log_activities') THEN
    RAISE EXCEPTION 'You do not have permission to log this pet''s weight' USING ERRCODE = '42501';
  END IF;
  -- Older deployments already enforce their own access rules through the
  -- existing permission helper. Honor the newer write guard when installed.
  IF to_regprocedure('public.pet_is_writable(uuid)') IS NOT NULL THEN
    IF NOT public.pet_is_writable(p_pet_id) THEN
      RAISE EXCEPTION 'This pet is read-only' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF p_recorded_at IS NULL OR p_logged_at IS NULL OR p_weight IS NULL
     OR p_weight <= 0 OR p_weight > 999999.99 OR p_unit NOT IN ('lbs', 'kg') OR p_unit IS NULL THEN
    RAISE EXCEPTION 'Enter a valid weight, unit, and date';
  END IF;
  -- All dates for a pet share a lock, including edits moving between dates.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_pet_id::text, 1));
  IF p_activity_id IS NOT NULL THEN
    SELECT * INTO v_source FROM public.pet_activities
      WHERE id = p_activity_id AND pet_id = p_pet_id AND activity_type = 'weigh_in' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Weigh-in not found'; END IF;
    IF NOT public.is_pet_owner(p_pet_id) AND v_source.logged_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You cannot edit another carer''s weigh-in' USING ERRCODE = '42501';
    END IF;
  END IF;
  SELECT * INTO v_entry FROM public.pet_weight_entries
    WHERE pet_id = p_pet_id AND recorded_at = p_recorded_at FOR UPDATE;
  IF v_entry.id IS NOT NULL AND v_entry.id IS DISTINCT FROM v_source.weight_entry_id THEN
    IF NOT p_replace_existing THEN
      RAISE EXCEPTION 'A weigh-in already exists for this date' USING ERRCODE = 'P2001';
    END IF;
    SELECT * INTO v_activity FROM public.pet_activities WHERE weight_entry_id = v_entry.id;
    IF v_activity.id IS NOT NULL AND NOT public.is_pet_owner(p_pet_id)
       AND v_activity.logged_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the pet owner can replace another carer''s weigh-in' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.pet_weight_entry_revisions(entry, activity)
      VALUES(to_jsonb(v_entry), CASE WHEN v_activity.id IS NOT NULL THEN to_jsonb(v_activity) END);
    IF v_source.id IS NOT NULL THEN
      DELETE FROM public.pet_weight_entries WHERE id = v_entry.id;
      v_entry := NULL;
    END IF;
  END IF;
  IF v_source.weight_entry_id IS NOT NULL THEN
    UPDATE public.pet_weight_entries SET recorded_at = p_recorded_at,
      weight_lbs = round(p_weight, 2), weight_unit = p_unit
      WHERE id = v_source.weight_entry_id RETURNING * INTO v_entry;
  ELSIF v_entry.id IS NOT NULL THEN
    UPDATE public.pet_weight_entries SET weight_lbs = round(p_weight, 2), weight_unit = p_unit
      WHERE id = v_entry.id RETURNING * INTO v_entry;
  ELSE
    INSERT INTO public.pet_weight_entries(pet_id, recorded_at, weight_lbs, weight_unit)
      VALUES(p_pet_id, p_recorded_at, round(p_weight, 2), p_unit) RETURNING * INTO v_entry;
  END IF;
  IF v_source.id IS NOT NULL THEN v_activity := v_source; END IF;
  IF v_activity.id IS NULL THEN
    INSERT INTO public.pet_activities(pet_id, logged_by, activity_type, label, notes,
      logged_at, weight_lbs, weight_unit, weight_entry_id)
    VALUES(p_pet_id, auth.uid(), 'weigh_in', coalesce(nullif(trim(p_label), ''), 'Weigh-in'),
      nullif(trim(p_notes), ''), p_logged_at, round(p_weight, 2), p_unit, v_entry.id)
    RETURNING * INTO v_activity;
  ELSE
    UPDATE public.pet_activities SET label = coalesce(nullif(trim(p_label), ''), 'Weigh-in'),
      notes = nullif(trim(p_notes), ''), logged_at = p_logged_at,
      weight_lbs = round(p_weight, 2), weight_unit = p_unit, weight_entry_id = v_entry.id
      WHERE id = v_activity.id RETURNING * INTO v_activity;
  END IF;
  SELECT * INTO v_latest FROM public.pet_weight_entries WHERE pet_id = p_pet_id
    ORDER BY recorded_at DESC, created_at DESC LIMIT 1;
  UPDATE public.pets SET weight_lbs = v_latest.weight_lbs, weight_unit = v_latest.weight_unit
    WHERE id = p_pet_id;
  RETURN v_activity;
END $$;
REVOKE ALL ON FUNCTION public.save_pet_weigh_in(uuid,date,timestamptz,numeric,text,text,text,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_pet_weigh_in(uuid,date,timestamptz,numeric,text,text,text,boolean,uuid) TO authenticated;
