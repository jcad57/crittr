-- Enable Realtime for pet_co_carers so co-carers receive permission updates
-- when the primary caretaker changes them (client subscribes in useUserPetPermissionsQuery).
--
-- Filtered postgres_changes on non-primary-key columns require REPLICA IDENTITY FULL.
-- See: https://supabase.com/docs/guides/realtime/postgres-changes

ALTER TABLE public.pet_co_carers REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pet_co_carers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_co_carers;
  END IF;
END $$;
