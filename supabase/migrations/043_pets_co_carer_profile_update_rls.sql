-- Co-carers with can_edit_pet_profile may update the pets row (name, breed,
-- exercise targets, etc.). The app already gates this in UI; RLS previously
-- allowed only the owner to UPDATE pets (policy "Users can update own pets"),
-- so co-carer saves produced 0 rows and PostgREST errors:
-- "Cannot coerce the result to a single JSON object" / "The result contains 0 rows".
--
-- public.has_pet_permission(id, 'can_edit_pet_profile') is true for the owner
-- (first branch) or for co-carers with that flag. A trigger blocks non-owners
-- from changing owner_id.

CREATE OR REPLACE FUNCTION public.prevent_pet_owner_id_change_by_non_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    IF OLD.owner_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Only the pet owner can change owner_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pets_owner_change_owner_only ON public.pets;
CREATE TRIGGER pets_owner_change_owner_only
  BEFORE UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_pet_owner_id_change_by_non_owner();

DROP POLICY IF EXISTS "Users can update own pets" ON public.pets;
DROP POLICY IF EXISTS "Co-carers with profile edit can update pets" ON public.pets;

CREATE POLICY "Users can update pets with profile permission"
  ON public.pets FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(id, 'can_edit_pet_profile'))
  WITH CHECK (public.has_pet_permission(id, 'can_edit_pet_profile'));
