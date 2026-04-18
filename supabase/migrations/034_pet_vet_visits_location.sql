-- Repair: some environments never applied `010_vet_visit_location.sql`; PostgREST then
-- rejects inserts that include `location` ("could not find ... column ... in schema cache").
alter table public.pet_vet_visits
  add column if not exists location text;

comment on column public.pet_vet_visits.location is
  'Optional clinic name or address for the scheduled visit.';
