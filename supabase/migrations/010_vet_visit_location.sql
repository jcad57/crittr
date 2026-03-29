-- Optional clinic / address for scheduled vet visits.
alter table public.pet_vet_visits
  add column if not exists location text;
