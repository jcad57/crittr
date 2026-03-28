-- Health hub: vaccinations, upcoming visits, weight history, optional med due date.

alter table public.pet_medications
  add column if not exists next_due_date date;

create table if not exists public.pet_vaccinations (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  name text not null,
  expires_on date,
  frequency_label text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pet_vet_visits (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  title text not null,
  visit_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pet_weight_entries (
  id uuid default gen_random_uuid() primary key,
  pet_id uuid references public.pets(id) on delete cascade not null,
  recorded_at date not null default (current_date),
  weight_lbs numeric not null,
  weight_unit text not null default 'lbs' check (weight_unit in ('lbs', 'kg')),
  created_at timestamptz not null default now()
);

alter table public.pet_vaccinations enable row level security;
alter table public.pet_vet_visits enable row level security;
alter table public.pet_weight_entries enable row level security;

create policy "Users can view own pet vaccinations"
  on public.pet_vaccinations for select
  using (exists (select 1 from public.pets p where p.id = pet_vaccinations.pet_id and p.owner_id = auth.uid()));

create policy "Users can insert own pet vaccinations"
  on public.pet_vaccinations for insert
  with check (exists (select 1 from public.pets p where p.id = pet_vaccinations.pet_id and p.owner_id = auth.uid()));

create policy "Users can update own pet vaccinations"
  on public.pet_vaccinations for update
  using (exists (select 1 from public.pets p where p.id = pet_vaccinations.pet_id and p.owner_id = auth.uid()));

create policy "Users can delete own pet vaccinations"
  on public.pet_vaccinations for delete
  using (exists (select 1 from public.pets p where p.id = pet_vaccinations.pet_id and p.owner_id = auth.uid()));

create policy "Users can view own pet vet visits"
  on public.pet_vet_visits for select
  using (exists (select 1 from public.pets p where p.id = pet_vet_visits.pet_id and p.owner_id = auth.uid()));

create policy "Users can insert own pet vet visits"
  on public.pet_vet_visits for insert
  with check (exists (select 1 from public.pets p where p.id = pet_vet_visits.pet_id and p.owner_id = auth.uid()));

create policy "Users can update own pet vet visits"
  on public.pet_vet_visits for update
  using (exists (select 1 from public.pets p where p.id = pet_vet_visits.pet_id and p.owner_id = auth.uid()));

create policy "Users can delete own pet vet visits"
  on public.pet_vet_visits for delete
  using (exists (select 1 from public.pets p where p.id = pet_vet_visits.pet_id and p.owner_id = auth.uid()));

create policy "Users can view own pet weight entries"
  on public.pet_weight_entries for select
  using (exists (select 1 from public.pets p where p.id = pet_weight_entries.pet_id and p.owner_id = auth.uid()));

create policy "Users can insert own pet weight entries"
  on public.pet_weight_entries for insert
  with check (exists (select 1 from public.pets p where p.id = pet_weight_entries.pet_id and p.owner_id = auth.uid()));

create policy "Users can update own pet weight entries"
  on public.pet_weight_entries for update
  using (exists (select 1 from public.pets p where p.id = pet_weight_entries.pet_id and p.owner_id = auth.uid()));

create policy "Users can delete own pet weight entries"
  on public.pet_weight_entries for delete
  using (exists (select 1 from public.pets p where p.id = pet_weight_entries.pet_id and p.owner_id = auth.uid()));
