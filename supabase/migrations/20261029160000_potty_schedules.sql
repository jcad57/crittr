-- Daily potty times share the pet's existing profile permissions and care zone.
-- An empty schedule is optional; adding this feature never creates default breaks.
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS potty_times time[] NOT NULL DEFAULT '{}';
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS potty_schedule_updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.valid_pet_potty_times(times time[]) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT times IS NOT NULL AND (cardinality(times)=0 OR array_ndims(times)=1)
    AND cardinality(times)=(SELECT count(DISTINCT t) FROM unnest(times) t)
    AND NOT EXISTS(SELECT 1 FROM unnest(times) t WHERE t IS NULL OR t>=time '24:00' OR extract(second FROM t)<>0);
$$;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.pets'::regclass AND conname='valid_pet_potty_times') THEN
    ALTER TABLE public.pets ADD CONSTRAINT valid_pet_potty_times CHECK(public.valid_pet_potty_times(potty_times));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.stamp_pet_potty_schedule() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.potty_times IS DISTINCT FROM OLD.potty_times THEN
    NEW.potty_schedule_updated_at:=now();
  ELSE
    NEW.potty_schedule_updated_at:=OLD.potty_schedule_updated_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stamp_pet_potty_schedule ON public.pets;
CREATE TRIGGER stamp_pet_potty_schedule BEFORE INSERT OR UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.stamp_pet_potty_schedule();

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='notify_potty_breaks') THEN
    ALTER TABLE public.profiles ADD COLUMN notify_potty_breaks boolean NOT NULL DEFAULT true;
    UPDATE public.profiles SET notify_potty_breaks=false WHERE NOT notify_meals_treats
      AND NOT notify_co_care_activities AND NOT notify_medications AND NOT notify_vet_visits AND NOT notify_vaccinations;
  END IF;
END $$;
COMMENT ON COLUMN public.profiles.notify_potty_breaks IS 'Daily reminders at saved potty times in the pet owner''s care time zone.';

-- Save this section atomically. Retain unchanged exercise IDs so saving potty
-- times does not reset existing schedule completion or repeat exercise alerts.
CREATE OR REPLACE FUNCTION public.save_pet_exercise_and_potty(
  p_pet_id uuid, p_energy_level text, p_exercise_plans jsonb, p_potty_times time[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE
  v_pet public.pets;
  v_plan jsonb;
  v_id uuid;
  v_ids uuid[]:='{}';
  v_days smallint[];
  v_order integer:=0;
BEGIN
  IF auth.uid() IS NULL OR public.has_pet_permission(p_pet_id,'can_edit_pet_profile') IS NOT TRUE THEN
    RAISE EXCEPTION 'You do not have permission to edit this pet' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_pet FROM public.pets WHERE id=p_pet_id FOR UPDATE;
  IF NOT FOUND OR v_pet.is_archived OR v_pet.is_memorialized THEN
    RAISE EXCEPTION 'This pet is read-only' USING ERRCODE='42501';
  END IF;
  IF to_regprocedure('public.pet_is_writable(uuid)') IS NOT NULL THEN
    IF NOT public.pet_is_writable(p_pet_id) THEN RAISE EXCEPTION 'This pet is read-only' USING ERRCODE='42501'; END IF;
  END IF;
  IF p_energy_level IS NULL OR p_energy_level NOT IN ('low','medium','high')
    OR jsonb_typeof(p_exercise_plans) IS DISTINCT FROM 'array'
    OR NOT public.valid_pet_potty_times(p_potty_times) THEN
    RAISE EXCEPTION 'Choose a valid energy level and care schedule';
  END IF;
  FOR v_plan IN SELECT value FROM jsonb_array_elements(p_exercise_plans) LOOP
    v_days:=ARRAY(SELECT value::smallint FROM jsonb_array_elements_text(v_plan->'days_of_week'));
    IF cardinality(v_days)=0 THEN RAISE EXCEPTION 'Choose at least one day for each activity'; END IF;
    v_id:=nullif(v_plan->>'id','')::uuid;
    IF v_id=ANY(v_ids) THEN RAISE EXCEPTION 'An activity was included twice'; END IF;
    IF v_id IS NOT NULL THEN
      UPDATE public.pet_exercise_plans SET label=trim(v_plan->>'label'),days_of_week=v_days,
        scheduled_time=(v_plan->>'scheduled_time')::time,notes=nullif(trim(v_plan->>'notes'),''),sort_order=v_order
        WHERE id=v_id AND pet_id=p_pet_id RETURNING id INTO v_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'An activity changed. Reload this pet and try again'; END IF;
    ELSE
      INSERT INTO public.pet_exercise_plans(pet_id,label,days_of_week,scheduled_time,notes,sort_order)
        VALUES(p_pet_id,trim(v_plan->>'label'),v_days,(v_plan->>'scheduled_time')::time,nullif(trim(v_plan->>'notes'),''),v_order)
        RETURNING id INTO v_id;
    END IF;
    v_ids:=array_append(v_ids,v_id);
    v_order:=v_order+1;
  END LOOP;
  DELETE FROM public.pet_exercise_plans WHERE pet_id=p_pet_id AND NOT(id=ANY(v_ids));
  UPDATE public.pets SET energy_level=p_energy_level,exercises_per_day=nullif(v_order,0),potty_times=p_potty_times
    WHERE id=p_pet_id RETURNING * INTO v_pet;
  RETURN jsonb_build_object('pet',to_jsonb(v_pet),'exercise_plans',coalesce((
    SELECT jsonb_agg(to_jsonb(p) ORDER BY p.sort_order) FROM public.pet_exercise_plans p WHERE p.pet_id=p_pet_id),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.save_pet_exercise_and_potty(uuid,text,jsonb,time[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_pet_exercise_and_potty(uuid,text,jsonb,time[]) TO authenticated;


-- Recheck the potty preference at enqueue and again immediately before delivery.
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
        WHEN 'notify_vaccinations' THEN p.notify_vaccinations WHEN 'notify_potty_breaks' THEN p.notify_potty_breaks WHEN 'notify_co_care_activities' THEN p.notify_co_care_activities ELSE false END
      AND NOT EXISTS(SELECT 1 FROM pet_schedule_items s WHERE s.pet_id=o.pet_id AND s.local_date=o.local_date
        AND s.source_kind=o.source_kind AND s.source_id=o.source_id AND s.source_slot=o.source_slot AND s.completed_at IS NOT NULL));
$$;
REVOKE ALL ON FUNCTION public.care_reminder_is_deliverable(uuid,uuid) FROM PUBLIC,anon,authenticated;

-- A scheduled potty completion records the selected outcome, activity and check
-- mark in one transaction. The existing undo RPC already handles linked rows.
CREATE OR REPLACE FUNCTION public.complete_pet_potty_schedule_item(p_item_id uuid,p_pee boolean,p_poo boolean)
RETURNS public.pet_schedule_items LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_item public.pet_schedule_items;
  v_activity uuid;
BEGIN
  SELECT * INTO v_item FROM public.pet_schedule_items WHERE id=p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.activity_type<>'potty' OR v_item.source_kind<>'potty' THEN
    RAISE EXCEPTION 'Potty break not found';
  END IF;
  IF auth.uid() IS NULL OR public.has_pet_permission(v_item.pet_id,'can_log_activities') IS NOT TRUE
    OR NOT EXISTS(SELECT 1 FROM pets WHERE id=v_item.pet_id AND NOT is_archived AND NOT is_memorialized
      AND v_item.scheduled_time=ANY(potty_times)) THEN
    RAISE EXCEPTION 'Not allowed to complete this potty break' USING ERRCODE='42501';
  END IF;
  IF to_regprocedure('public.pet_is_writable(uuid)') IS NOT NULL THEN
    IF NOT public.pet_is_writable(v_item.pet_id) THEN RAISE EXCEPTION 'This pet is read-only' USING ERRCODE='42501'; END IF;
  END IF;
  IF v_item.completed_at IS NOT NULL THEN RETURN v_item; END IF;
  IF NOT(coalesce(p_pee,false) OR coalesce(p_poo,false)) THEN RAISE EXCEPTION 'Choose pee, poo, or both'; END IF;
  INSERT INTO public.pet_activities(pet_id,logged_by,activity_type,label,logged_at,potty_pee,potty_poo,notes)
    VALUES(v_item.pet_id,auth.uid(),'potty',v_item.label,now(),coalesce(p_pee,false),coalesce(p_poo,false),v_item.notes)
    RETURNING id INTO v_activity;
  UPDATE public.pet_schedule_items SET completed_at=now(),activity_id=v_activity,updated_at=now()
    WHERE id=v_item.id RETURNING * INTO v_item;
  RETURN v_item;
END $$;
REVOKE ALL ON FUNCTION public.complete_pet_potty_schedule_item(uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_pet_potty_schedule_item(uuid,boolean,boolean) TO authenticated;

NOTIFY pgrst,'reload schema';
