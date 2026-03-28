-- Optional microchip ID / registry number (separate from is_microchipped flag)
alter table public.pets
  add column if not exists microchip_number text;

comment on column public.pets.microchip_number is
  'ISO/AVID microchip registration number when known.';
