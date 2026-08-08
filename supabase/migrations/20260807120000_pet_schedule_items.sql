-- Daily pet schedule slots (meals, meds, exercise, vet visits).
-- Today + future rows are rebuilt from the live pet profile; past days stay frozen.

CREATE TABLE IF NOT EXISTS public.pet_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  -- Local calendar day for this slot (device timezone when written by the app).
  local_date date NOT NULL,
  -- Planned local clock time (HH:MM:SS).
  scheduled_time time NOT NULL,
  activity_type public.activity_type NOT NULL,
  -- Stable identity for upsert/sync across profile edits.
  source_kind text NOT NULL,
  source_id text NOT NULL,
  source_slot text NOT NULL DEFAULT '',
  -- Snapshotted display fields (frozen for past days).
  label text NOT NULL,
  detail_line text,
  quantity_line text,
  notes text,
  -- Completion → linked pet_activities row when marked done from Schedule.
  completed_at timestamptz,
  activity_id uuid REFERENCES public.pet_activities (id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_schedule_items_source_unique
    UNIQUE (pet_id, local_date, source_kind, source_id, source_slot)
);

CREATE INDEX IF NOT EXISTS idx_pet_schedule_items_pet_date
  ON public.pet_schedule_items (pet_id, local_date);

CREATE INDEX IF NOT EXISTS idx_pet_schedule_items_activity_id
  ON public.pet_schedule_items (activity_id)
  WHERE activity_id IS NOT NULL;

COMMENT ON TABLE public.pet_schedule_items IS
  'Materialized daily schedule for a pet. Past local_date rows are immutable; today/future resync from profile.';

COMMENT ON COLUMN public.pet_schedule_items.source_kind IS
  'food_portion | food_treat | medication | exercise | vet_visit';

COMMENT ON COLUMN public.pet_schedule_items.source_slot IS
  'Disambiguator within source (e.g. reminder HH:mm, walk index). Empty string when unused.';

ALTER TABLE public.pet_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible pet schedule items"
  ON public.pet_schedule_items FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

CREATE POLICY "Users can insert pet schedule items with log permission"
  ON public.pet_schedule_items FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_log_activities'));

CREATE POLICY "Users can update pet schedule items with log permission"
  ON public.pet_schedule_items FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_log_activities'))
  WITH CHECK (public.has_pet_permission(pet_id, 'can_log_activities'));

CREATE POLICY "Users can delete pet schedule items with log permission"
  ON public.pet_schedule_items FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_log_activities'));
