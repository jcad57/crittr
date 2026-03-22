-- ============================================================================
-- Crittr: Initial Schema
-- Run this in the Supabase SQL editor or via the CLI.
-- ============================================================================

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  display_name text,
  bio text,
  avatar_url text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Pets ─────────────────────────────────────────────────────────────────────
create table public.pets (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  breed text,
  age integer,
  weight_lbs numeric,
  sex text check (sex in ('male', 'female')),
  color text,
  about text,
  energy_level text check (energy_level in ('low', 'medium', 'high')),
  allergies text[] default '{}',
  avatar_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pets enable row level security;

create policy "Users can view own pets"
  on public.pets for select
  using (auth.uid() = owner_id);

create policy "Users can insert own pets"
  on public.pets for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own pets"
  on public.pets for update
  using (auth.uid() = owner_id);

create policy "Users can delete own pets"
  on public.pets for delete
  using (auth.uid() = owner_id);

-- ── Pet Foods ────────────────────────────────────────────────────────────────
create table public.pet_foods (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  brand text not null,
  portion_size text,
  portion_unit text,
  meals_per_day integer,
  is_treat boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pet_foods enable row level security;

create policy "Users can view own pet foods"
  on public.pet_foods for select
  using (
    exists (
      select 1 from public.pets where pets.id = pet_foods.pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Users can insert own pet foods"
  on public.pet_foods for insert
  with check (
    exists (
      select 1 from public.pets where pets.id = pet_foods.pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Users can update own pet foods"
  on public.pet_foods for update
  using (
    exists (
      select 1 from public.pets where pets.id = pet_foods.pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Users can delete own pet foods"
  on public.pet_foods for delete
  using (
    exists (
      select 1 from public.pets where pets.id = pet_foods.pet_id and pets.owner_id = auth.uid()
    )
  );

-- ── Pet Medications ──────────────────────────────────────────────────────────
create table public.pet_medications (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  name text not null,
  dosage text,
  frequency text,
  condition text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pet_medications enable row level security;

create policy "Users can view own pet medications"
  on public.pet_medications for select
  using (
    exists (
      select 1 from public.pets where pets.id = pet_medications.pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Users can insert own pet medications"
  on public.pet_medications for insert
  with check (
    exists (
      select 1 from public.pets where pets.id = pet_medications.pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Users can update own pet medications"
  on public.pet_medications for update
  using (
    exists (
      select 1 from public.pets where pets.id = pet_medications.pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Users can delete own pet medications"
  on public.pet_medications for delete
  using (
    exists (
      select 1 from public.pets where pets.id = pet_medications.pet_id and pets.owner_id = auth.uid()
    )
  );

-- ── Pet Exercises ────────────────────────────────────────────────────────────
create table public.pet_exercises (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  walks_per_day integer,
  walk_duration_minutes integer,
  activities text[] default '{}',
  created_at timestamptz not null default now()
);

alter table public.pet_exercises enable row level security;

create policy "Users can view own pet exercises"
  on public.pet_exercises for select
  using (
    exists (
      select 1 from public.pets where pets.id = pet_exercises.pet_id and pets.owner_id = auth.uid()
    )
  );

create policy "Users can insert own pet exercises"
  on public.pet_exercises for insert
  with check (
    exists (
      select 1 from public.pets where pets.id = pet_exercises.pet_id and pets.owner_id = auth.uid()
    )
  );

-- ── Co-Carer Invites ────────────────────────────────────────────────────────
create table public.co_carer_invites (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete cascade not null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.co_carer_invites enable row level security;

create policy "Users can view own invites"
  on public.co_carer_invites for select
  using (auth.uid() = invited_by);

create policy "Users can insert own invites"
  on public.co_carer_invites for insert
  with check (auth.uid() = invited_by);

-- ── Storage ──────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Authenticated users can update own avatars"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ── Updated-at triggers ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger pets_updated_at
  before update on public.pets
  for each row execute function public.set_updated_at();
