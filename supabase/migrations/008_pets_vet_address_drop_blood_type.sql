-- Legacy cleanup: remove blood_type if a prior migration added it; ensure vet address exists.
alter table public.pets
  add column if not exists primary_vet_address text;

alter table public.pets
  drop column if exists blood_type;

comment on column public.pets.primary_vet_address is
  'Mailing or street address for the primary veterinary clinic.';
