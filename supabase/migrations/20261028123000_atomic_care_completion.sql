-- Commit the check mark, activity and co-carer delivery jobs together. A mobile
-- background task must not be responsible for finishing a saved completion.
CREATE OR REPLACE FUNCTION public.notify_shared_care_completion(
  p_pet_id uuid, p_actor_id uuid, p_label text, p_activity_type text,
  p_is_treat boolean, p_activity_id uuid, p_schedule_item_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pet public.pets; v_actor text; v_task text; v_data jsonb;
BEGIN
  SELECT * INTO v_pet FROM public.pets WHERE id = p_pet_id;
  IF NOT FOUND OR v_pet.is_archived OR v_pet.is_memorialized OR p_actor_id IS NULL THEN RETURN; END IF;
  SELECT coalesce(nullif(trim(concat_ws(' ', first_name, last_name)), ''), 'A carer')
    INTO v_actor FROM public.profiles WHERE id = p_actor_id;
  v_task := CASE p_activity_type
    WHEN 'food' THEN CASE WHEN p_is_treat THEN 'a treat' ELSE 'a meal' END
    WHEN 'exercise' THEN 'exercise' WHEN 'medication' THEN 'a medication'
    WHEN 'vet_visit' THEN 'a vet visit' ELSE 'a care task' END;
  v_data := jsonb_strip_nulls(jsonb_build_object('pet_id', p_pet_id,
    'activity_id', p_activity_id, 'schedule_item_id', p_schedule_item_id,
    'actor_user_id', p_actor_id, 'type', 'co_carer_activity_logged',
    'href', CASE WHEN p_activity_id IS NOT NULL THEN '/(logged-in)/manage-activity-item/' || p_activity_id::text
      ELSE '/(logged-in)/(tabs)/activity' END));
  INSERT INTO public.notifications(user_id, type, title, body, data)
    SELECT recipient.id, 'co_carer_activity_logged', v_pet.name || ': task completed',
      coalesce(v_actor, 'A carer') || ' completed ' || v_task || ' for ' || v_pet.name
        || CASE WHEN nullif(trim(p_label), '') IS NOT NULL THEN ': ' || trim(p_label) ELSE '' END,
      v_data
    FROM (
      SELECT v_pet.owner_id AS id
      UNION SELECT user_id FROM public.pet_co_carers WHERE pet_id = p_pet_id
    ) recipient JOIN public.profiles profile ON profile.id = recipient.id
    WHERE recipient.id <> p_actor_id AND profile.notify_co_care_activities
      AND public.push_recipient_has_pet_access(p_pet_id, recipient.id);
END $$;
REVOKE ALL ON FUNCTION public.notify_shared_care_completion(uuid,uuid,text,text,boolean,uuid,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_co_carers_on_activity_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Scheduled vet mirrors are calendar entries, not user completion events.
  IF NEW.logged_by IS NULL OR NEW.vet_visit_id IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM public.notify_shared_care_completion(NEW.pet_id, NEW.logged_by, NEW.label,
    NEW.activity_type::text, coalesce(NEW.is_treat, false), NEW.id);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_pet_schedule_item_completed(p_item_id uuid, p_completed boolean)
RETURNS public.pet_schedule_items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_item public.pet_schedule_items;
  v_activity uuid;
  v_food uuid;
  v_medication uuid;
  v_amount numeric;
  v_unit text;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_item FROM public.pet_schedule_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule item not found' USING ERRCODE = 'P0002'; END IF;
  IF auth.uid() IS NULL OR public.has_pet_permission(v_item.pet_id, 'can_log_activities') IS NOT TRUE
    OR NOT EXISTS(SELECT 1 FROM pets WHERE id=v_item.pet_id AND NOT is_archived AND NOT is_memorialized) THEN
    RAISE EXCEPTION 'Not allowed to complete this task' USING ERRCODE = '42501';
  END IF;
  IF p_completed IS NULL THEN RAISE EXCEPTION 'Completion is required'; END IF;
  IF p_completed AND v_item.completed_at IS NOT NULL THEN RETURN v_item; END IF;
  IF NOT p_completed AND v_item.completed_at IS NULL THEN RETURN v_item; END IF;

  IF NOT p_completed THEN
    v_activity := v_item.activity_id;
    UPDATE public.pet_schedule_items SET completed_at = NULL, activity_id = NULL, updated_at = v_now
      WHERE id = v_item.id RETURNING * INTO v_item;
    -- Retire an undone completion before a delayed worker can send it.
    DELETE FROM public.notifications WHERE type = 'co_carer_activity_logged'
      AND (data->>'schedule_item_id' = v_item.id::text
        OR (v_activity IS NOT NULL AND data->>'activity_id' = v_activity::text));
    IF v_activity IS NOT NULL AND v_item.source_kind <> 'vet_visit' THEN
      DELETE FROM public.pet_activities WHERE id = v_activity AND pet_id = v_item.pet_id;
    END IF;
    RETURN v_item;
  END IF;

  IF v_item.activity_id IS NOT NULL THEN
    v_activity := v_item.activity_id;
  ELSIF v_item.activity_type = 'food' THEN
    SELECT id INTO v_food FROM public.pet_foods
      WHERE id::text = v_item.meta->>'food_id' AND pet_id = v_item.pet_id;
    v_unit := nullif(v_item.meta->>'portion_unit', '');
    IF (v_item.meta->>'portion_size') ~ '^[0-9]+([.][0-9]+)?$' THEN
      v_amount := (v_item.meta->>'portion_size')::numeric;
    ELSIF split_part(coalesce(v_item.quantity_line, ''), ' ', 1) ~ '^[0-9]+([.][0-9]+)?$' THEN
      v_amount := split_part(v_item.quantity_line, ' ', 1)::numeric;
      v_unit := coalesce(v_unit, nullif(trim(substr(v_item.quantity_line, strpos(v_item.quantity_line, ' '))), ''));
    END IF;
    INSERT INTO public.pet_activities(pet_id, logged_by, activity_type, label, logged_at,
      is_treat, food_id, food_custom_name, food_amount, food_unit, notes)
    VALUES(v_item.pet_id, auth.uid(), 'food', v_item.label, v_now,
      coalesce(v_item.meta->>'is_treat' = 'true', false) OR v_item.source_kind = 'food_treat',
      v_food, CASE WHEN v_food IS NULL THEN coalesce(v_item.detail_line, v_item.label) END,
      v_amount, v_unit, v_item.notes) RETURNING id INTO v_activity;
  ELSIF v_item.activity_type = 'medication' THEN
    SELECT id INTO v_medication FROM public.pet_medications
      WHERE pet_id = v_item.pet_id AND id::text = coalesce(nullif(v_item.meta->>'medication_id', ''), v_item.source_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Medication no longer exists'; END IF;
    IF (v_item.meta->>'amount') ~ '^[0-9]+([.][0-9]+)?$' THEN
      v_amount := (v_item.meta->>'amount')::numeric;
    END IF;
    INSERT INTO public.pet_activities(pet_id, logged_by, activity_type, label, logged_at,
      medication_id, med_amount, med_unit, notes)
    VALUES(v_item.pet_id, auth.uid(), 'medication', v_item.label, v_now,
      v_medication, v_amount, nullif(v_item.meta->>'unit', ''), v_item.notes) RETURNING id INTO v_activity;
  ELSIF v_item.activity_type = 'exercise' THEN
    INSERT INTO public.pet_activities(pet_id, logged_by, activity_type, label, logged_at,
      exercise_type, duration_minutes, location, notes)
    VALUES(v_item.pet_id, auth.uid(), 'exercise', v_item.label, v_now,
      coalesce(nullif(v_item.meta->>'exercise_type', ''), v_item.label),
      CASE WHEN (v_item.meta->>'duration_minutes') ~ '^[0-9]+$' THEN (v_item.meta->>'duration_minutes')::integer END,
      coalesce(v_item.detail_line, 'Home'), v_item.notes) RETURNING id INTO v_activity;
  ELSIF v_item.activity_type = 'vet_visit' THEN
    PERFORM public.notify_shared_care_completion(v_item.pet_id, auth.uid(), v_item.label,
      'vet_visit', false, NULL, v_item.id);
  ELSE
    RAISE EXCEPTION 'Unsupported scheduled task';
  END IF;
  UPDATE public.pet_schedule_items SET completed_at = v_now, activity_id = v_activity, updated_at = v_now
    WHERE id = v_item.id RETURNING * INTO v_item;
  RETURN v_item;
END $$;
REVOKE ALL ON FUNCTION public.set_pet_schedule_item_completed(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_pet_schedule_item_completed(uuid,boolean) TO authenticated;
