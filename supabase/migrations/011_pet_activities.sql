-- ── Pet Activities ─────────────────────────────────────────────────────────
-- Unified log table for exercise, food (meal/treat), medication, and vet visits.

create type public.activity_type as enum ('exercise', 'food', 'medication', 'vet_visit');

create table public.pet_activities (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  logged_by uuid references auth.users(id) on delete set null,

  activity_type public.activity_type not null,
  label text not null,
  logged_at timestamptz not null default now(),

  -- Exercise fields
  exercise_type text,            -- Walk, Run, Dog Park, Home Playtime, Other
  duration_hours integer,
  duration_minutes integer,
  distance_miles numeric(6,2),
  location text,

  -- Food fields
  is_treat boolean,
  food_id uuid references public.pet_foods(id) on delete set null,
  food_amount numeric(8,2),
  food_unit text,                -- Cups, Ounces, Piece(s)

  -- Medication fields
  medication_id uuid references public.pet_medications(id) on delete set null,
  med_amount numeric(8,2),
  med_unit text,                 -- Tablet, Injection, Liquid, Topical, Chewable, Other

  -- Vet visit fields
  vet_location text,
  other_pet_ids uuid[],          -- Additional pets seen at the same visit

  -- Shared
  notes text,

  created_at timestamptz not null default now()
);

create index idx_pet_activities_pet_date on public.pet_activities (pet_id, logged_at desc);

alter table public.pet_activities enable row level security;

create policy "Users can view own pet activities"
  on public.pet_activities for select
  using (
    exists (
      select 1 from public.pets
      where pets.id = pet_activities.pet_id
        and pets.owner_id = auth.uid()
    )
  );

create policy "Users can insert own pet activities"
  on public.pet_activities for insert
  with check (
    exists (
      select 1 from public.pets
      where pets.id = pet_activities.pet_id
        and pets.owner_id = auth.uid()
    )
  );

create policy "Users can update own pet activities"
  on public.pet_activities for update
  using (
    exists (
      select 1 from public.pets
      where pets.id = pet_activities.pet_id
        and pets.owner_id = auth.uid()
    )
  );

create policy "Users can delete own pet activities"
  on public.pet_activities for delete
  using (
    exists (
      select 1 from public.pets
      where pets.id = pet_activities.pet_id
        and pets.owner_id = auth.uid()
    )
  );
