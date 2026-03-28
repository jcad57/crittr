-- Manual food/treat name when the activity is not linked to a pet_foods row.
alter table public.pet_activities
  add column if not exists food_custom_name text;

comment on column public.pet_activities.food_custom_name is
  'When food_id is null, the food or treat name entered by the user (e.g. ad-hoc treat).';
