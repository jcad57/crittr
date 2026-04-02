-- ============================================================================
-- Group medical uploads under pet_medical_records; files in pet_medical_record_files
-- Migrates from pet_medical_record_uploads (1 row = 1 file) to parent + children.
-- ============================================================================

-- ── 1. New tables ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pet_medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_medical_records_pet_created
  ON public.pet_medical_records (pet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.pet_medical_record_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES public.pet_medical_records(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_medical_record_files_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_pet_medical_record_files_record
  ON public.pet_medical_record_files (medical_record_id, created_at ASC);

DROP TRIGGER IF EXISTS pet_medical_records_updated_at ON public.pet_medical_records;
CREATE TRIGGER pet_medical_records_updated_at
  BEFORE UPDATE ON public.pet_medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── 2. Migrate legacy single-table rows (if present) ───────────────────────

DO $$
BEGIN
  IF to_regclass('public.pet_medical_record_uploads') IS NOT NULL THEN
    INSERT INTO public.pet_medical_records (id, pet_id, title, created_by, created_at, updated_at)
    SELECT id, pet_id, title, uploaded_by, created_at, created_at
    FROM public.pet_medical_record_uploads;

    INSERT INTO public.pet_medical_record_files (
      id,
      medical_record_id,
      storage_path,
      original_filename,
      mime_type,
      file_size_bytes,
      created_at
    )
    SELECT
      gen_random_uuid(),
      id,
      storage_path,
      original_filename,
      mime_type,
      file_size_bytes,
      created_at
    FROM public.pet_medical_record_uploads;

    DROP TABLE public.pet_medical_record_uploads CASCADE;
  END IF;
END $$;

ALTER TABLE public.pet_medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_medical_record_files ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS: pet_medical_records ─────────────────────────────────────────────

DROP POLICY IF EXISTS "pet_medical_records_select" ON public.pet_medical_records;
CREATE POLICY "pet_medical_records_select"
  ON public.pet_medical_records FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "pet_medical_records_insert" ON public.pet_medical_records;
CREATE POLICY "pet_medical_records_insert"
  ON public.pet_medical_records FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_pet_permission(pet_id, 'can_manage_pet_records')
    AND auth.uid() = created_by
  );

DROP POLICY IF EXISTS "pet_medical_records_update" ON public.pet_medical_records;
CREATE POLICY "pet_medical_records_update"
  ON public.pet_medical_records FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_pet_records'))
  WITH CHECK (public.has_pet_permission(pet_id, 'can_manage_pet_records'));

DROP POLICY IF EXISTS "pet_medical_records_delete" ON public.pet_medical_records;
CREATE POLICY "pet_medical_records_delete"
  ON public.pet_medical_records FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_pet_records'));

-- ── 4. RLS: pet_medical_record_files ──────────────────────────────────────

DROP POLICY IF EXISTS "pet_medical_record_files_select" ON public.pet_medical_record_files;
CREATE POLICY "pet_medical_record_files_select"
  ON public.pet_medical_record_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_medical_records mr
      WHERE mr.id = medical_record_id
        AND public.can_access_pet(mr.pet_id)
    )
  );

DROP POLICY IF EXISTS "pet_medical_record_files_insert" ON public.pet_medical_record_files;
CREATE POLICY "pet_medical_record_files_insert"
  ON public.pet_medical_record_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pet_medical_records mr
      WHERE mr.id = medical_record_id
        AND public.has_pet_permission(mr.pet_id, 'can_manage_pet_records')
    )
  );

DROP POLICY IF EXISTS "pet_medical_record_files_delete" ON public.pet_medical_record_files;
CREATE POLICY "pet_medical_record_files_delete"
  ON public.pet_medical_record_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pet_medical_records mr
      WHERE mr.id = medical_record_id
        AND public.has_pet_permission(mr.pet_id, 'can_manage_pet_records')
    )
  );
