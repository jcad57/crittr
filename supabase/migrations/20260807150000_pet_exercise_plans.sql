-- Planned exercise activities per pet (label, days of week, time, notes).
-- Replaces relying on pets.exercises_per_day alone for schedule slots.

CREATE TABLE IF NOT EXISTS public.pet_exercise_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets (id) ON DELETE CASCADE,
  label text NOT NULL,
  -- JS Date.getDay(): 0=Sunday … 6=Saturday
  days_of_week smallint[] NOT NULL DEFAULT '{}',
  scheduled_time time NOT NULL DEFAULT '08:00:00',
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_exercise_plans_days_valid CHECK (
    days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),
  CONSTRAINT pet_exercise_plans_label_nonempty CHECK (length(trim(label)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_pet_exercise_plans_pet_id
  ON public.pet_exercise_plans (pet_id);

CREATE INDEX IF NOT EXISTS idx_pet_exercise_plans_scheduled_time
  ON public.pet_exercise_plans (scheduled_time);

COMMENT ON TABLE public.pet_exercise_plans IS
  'User-planned exercise activities for a pet; days_of_week + scheduled_time drive the schedule tab.';

COMMENT ON COLUMN public.pet_exercise_plans.days_of_week IS
  'Weekdays this activity occurs (0=Sun … 6=Sat, matching JS Date.getDay()).';

ALTER TABLE public.pet_exercise_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view accessible pet exercise plans"
  ON public.pet_exercise_plans FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

CREATE POLICY "Users can insert pet exercise plans with permission"
  ON public.pet_exercise_plans FOR INSERT
  TO authenticated
  WITH CHECK (public.has_pet_permission(pet_id, 'can_edit_pet_profile'));

CREATE POLICY "Users can update pet exercise plans with permission"
  ON public.pet_exercise_plans FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_edit_pet_profile'));

CREATE POLICY "Users can delete pet exercise plans with permission"
  ON public.pet_exercise_plans FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_edit_pet_profile'));

-- Backfill from legacy exercises_per_day (all days, staggered default hours).
WITH legacy AS (
  SELECT
    p.id AS pet_id,
    p.pet_type,
    LEAST(8, GREATEST(1, p.exercises_per_day)) AS n
  FROM public.pets p
  WHERE p.exercises_per_day IS NOT NULL
    AND p.exercises_per_day > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.pet_exercise_plans ep WHERE ep.pet_id = p.id
    )
),
slots AS (
  SELECT
    l.pet_id,
    CASE
      WHEN l.pet_type = 'cat' THEN 'Playtime'
      ELSE 'Walk'
    END AS label,
    ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[] AS days_of_week,
    (ARRAY[
      TIME '08:00:00',
      TIME '12:00:00',
      TIME '17:00:00',
      TIME '19:00:00',
      TIME '09:00:00',
      TIME '15:00:00',
      TIME '18:00:00',
      TIME '20:00:00'
    ])[gs.i + 1] AS scheduled_time,
    gs.i AS sort_order
  FROM legacy l
  CROSS JOIN LATERAL generate_series(0, l.n - 1) AS gs(i)
)
INSERT INTO public.pet_exercise_plans (
  pet_id,
  label,
  days_of_week,
  scheduled_time,
  notes,
  sort_order
)
SELECT
  pet_id,
  label,
  days_of_week,
  scheduled_time,
  NULL,
  sort_order
FROM slots;
