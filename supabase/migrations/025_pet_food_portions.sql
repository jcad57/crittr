-- Per-meal feeding portions with scheduled times (for notifications / reminders).
-- Treats continue to use pet_foods.portion_* and meals_per_day only.

CREATE TABLE IF NOT EXISTS public.pet_food_portions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_food_id uuid NOT NULL REFERENCES public.pet_foods (id) ON DELETE CASCADE,
  portion_size text,
  portion_unit text,
  -- Local time-of-day when this portion is fed (PostgreSQL `time`).
  feed_time time NOT NULL DEFAULT '08:00:00',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_food_portions_pet_food_id
  ON public.pet_food_portions (pet_food_id);

CREATE INDEX IF NOT EXISTS idx_pet_food_portions_feed_time
  ON public.pet_food_portions (feed_time);

COMMENT ON TABLE public.pet_food_portions IS
  'Scheduled meal portions for a pet_foods row (meals only). Times support future notification scheduling.';

COMMENT ON COLUMN public.pet_food_portions.feed_time IS
  'Local clock time for this feeding; pair with user timezone in app when scheduling notifications.';

ALTER TABLE public.pet_food_portions ENABLE ROW LEVEL SECURITY;

-- SELECT: anyone who can access the parent pet
CREATE POLICY "Users can view accessible pet food portions"
  ON public.pet_food_portions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_foods pf
      WHERE pf.id = pet_food_portions.pet_food_id
        AND public.can_access_pet(pf.pet_id)
    )
  );

CREATE POLICY "Users can insert pet food portions with permission"
  ON public.pet_food_portions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_foods pf
      WHERE pf.id = pet_food_portions.pet_food_id
        AND public.has_pet_permission(pf.pet_id, 'can_manage_food')
    )
  );

CREATE POLICY "Users can update pet food portions with permission"
  ON public.pet_food_portions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_foods pf
      WHERE pf.id = pet_food_portions.pet_food_id
        AND public.has_pet_permission(pf.pet_id, 'can_manage_food')
    )
  );

CREATE POLICY "Users can delete pet food portions with permission"
  ON public.pet_food_portions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_foods pf
      WHERE pf.id = pet_food_portions.pet_food_id
        AND public.has_pet_permission(pf.pet_id, 'can_manage_food')
    )
  );
