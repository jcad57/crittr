-- ============================================================================
-- Pet insurance: policy number column + policy document files + storage bucket
-- ============================================================================

-- ── 1. Column on pets ───────────────────────────────────────────────────────

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS insurance_policy_number text;

COMMENT ON COLUMN public.pets.insurance_policy_number IS
  'Policy or member ID when the pet is insured.';

-- ── 2. Table: pet_insurance_files ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pet_insurance_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_insurance_files_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_pet_insurance_files_pet_created
  ON public.pet_insurance_files (pet_id, created_at DESC);

ALTER TABLE public.pet_insurance_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_insurance_files_select" ON public.pet_insurance_files;
CREATE POLICY "pet_insurance_files_select"
  ON public.pet_insurance_files FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "pet_insurance_files_insert" ON public.pet_insurance_files;
CREATE POLICY "pet_insurance_files_insert"
  ON public.pet_insurance_files FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_pet_permission(pet_id, 'can_edit_pet_profile')
    AND auth.uid() = uploaded_by
  );

DROP POLICY IF EXISTS "pet_insurance_files_delete" ON public.pet_insurance_files;
CREATE POLICY "pet_insurance_files_delete"
  ON public.pet_insurance_files FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_edit_pet_profile'));

-- ── 3. Storage bucket (private — app uses signed URLs) ───────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-insurance', 'pet-insurance', false)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

-- Path: {pet_id}/{file_id}/{filename} — first segment is pet UUID for RLS.

DROP POLICY IF EXISTS "Pet insurance read" ON storage.objects;
CREATE POLICY "Pet insurance read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'pet-insurance'
    AND public.can_access_pet((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS "Pet insurance insert" ON storage.objects;
CREATE POLICY "Pet insurance insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pet-insurance'
    AND public.has_pet_permission((split_part(name, '/', 1))::uuid, 'can_edit_pet_profile')
  );

DROP POLICY IF EXISTS "Pet insurance delete" ON storage.objects;
CREATE POLICY "Pet insurance delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pet-insurance'
    AND public.has_pet_permission((split_part(name, '/', 1))::uuid, 'can_edit_pet_profile')
  );

-- Verification (run in SQL Editor after migrate):
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'pets'
--   AND column_name IN ('is_insured', 'insurance_provider', 'insurance_policy_number');
-- SELECT id, public FROM storage.buckets WHERE id = 'pet-insurance';
-- SELECT COUNT(*) FROM public.pet_insurance_files;
