-- Microchip flag for pets (nullable = unknown / not answered)
alter table public.pets
  add column if not exists is_microchipped boolean;

comment on column public.pets.is_microchipped is
  'Whether the pet has a microchip; null if not specified.';
