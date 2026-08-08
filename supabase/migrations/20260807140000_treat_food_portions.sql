-- Unify treats onto the same scheduled-portion model as meals.
-- Treats previously used pet_foods.portion_* + meals_per_day only;
-- they now get pet_food_portions rows with feed_time (is_treat remains the type flag).

COMMENT ON TABLE public.pet_food_portions IS
  'Scheduled feeding portions for a pet_foods row (meals and treats). Times support notifications and the schedule tab.';

-- Expand each legacy treat into N portion rows using the same default hours as the app.
WITH treat_slots AS (
  SELECT
    pf.id AS pet_food_id,
    pf.portion_size,
    COALESCE(NULLIF(TRIM(pf.portion_unit), ''), 'Piece(s)') AS portion_unit,
    gs.i AS sort_order,
    (ARRAY[
      TIME '08:00:00',
      TIME '12:00:00',
      TIME '18:00:00',
      TIME '07:00:00',
      TIME '13:00:00',
      TIME '19:00:00',
      TIME '09:00:00',
      TIME '17:00:00'
    ])[gs.i + 1] AS feed_time
  FROM public.pet_foods pf
  CROSS JOIN LATERAL generate_series(
    0,
    LEAST(7, GREATEST(0, COALESCE(pf.meals_per_day, 1) - 1))
  ) AS gs(i)
  WHERE pf.is_treat = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.pet_food_portions p
      WHERE p.pet_food_id = pf.id
    )
)
INSERT INTO public.pet_food_portions (
  pet_food_id,
  portion_size,
  portion_unit,
  feed_time,
  sort_order
)
SELECT
  pet_food_id,
  portion_size,
  portion_unit,
  feed_time,
  sort_order
FROM treat_slots;

-- Clear legacy flat fields on treats that now have portion rows; mirror count on meals_per_day.
UPDATE public.pet_foods pf
SET
  portion_size = NULL,
  portion_unit = NULL,
  meals_per_day = (
    SELECT COUNT(*)::integer
    FROM public.pet_food_portions p
    WHERE p.pet_food_id = pf.id
  )
WHERE pf.is_treat = true
  AND EXISTS (
    SELECT 1
    FROM public.pet_food_portions p
    WHERE p.pet_food_id = pf.id
  );
