-- Memorialized pets remain in My Pets for remembrance but are excluded from dashboard / active flows.

alter table public.pets
  add column if not exists is_memorialized boolean not null default false;

alter table public.pets
  add column if not exists memorialized_at timestamptz null;

comment on column public.pets.is_memorialized is
  'True when the pet has passed; profile remains viewable, hidden from dashboard pet switcher.';

comment on column public.pets.memorialized_at is
  'When the pet was marked as memorialized.';
