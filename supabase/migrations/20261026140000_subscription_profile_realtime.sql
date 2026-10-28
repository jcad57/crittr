-- Dashboard grants/revocations reach a signed-in app through its verified
-- profile. Existing profiles SELECT RLS still controls which rows are visible.
-- Safe to apply before or after the broader subscription reliability rollout.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public' AND tablename = 'profiles'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
