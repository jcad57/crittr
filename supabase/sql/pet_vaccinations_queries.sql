-- pet_vaccinations: schema + RLS live in supabase/migrations/009_health_snapshot.sql
--
-- App usage: fetchPetProfile loads vaccinations with:
--   select * from pet_vaccinations where pet_id = $petId
--
-- Example: all vaccination rows for one pet (Supabase SQL editor)

select
  id,
  pet_id,
  name,
  expires_on,
  frequency_label,
  notes,
  created_at
from public.pet_vaccinations
where pet_id = '00000000-0000-0000-0000-000000000000'::uuid -- replace with pet id
order by expires_on nulls last, name asc;

-- Example: insert a row (matches createPet / client shape; RLS requires pet.owner_id = auth.uid())

-- insert into public.pet_vaccinations (pet_id, name, expires_on, frequency_label, notes)
-- values (
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'Rabies',
--   '2026-12-01',
--   '3-year',
--   null
-- );
