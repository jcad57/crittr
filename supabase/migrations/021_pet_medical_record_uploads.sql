-- ============================================================================
-- Pet medical record file uploads (co-care permission + storage + RLS)
-- ============================================================================

-- ── 1. Co-care permission: can_manage_pet_records ───────────────────────────

UPDATE public.pet_co_carers
SET permissions = permissions || '{"can_manage_pet_records": false}'::jsonb
WHERE NOT (permissions ? 'can_manage_pet_records');

UPDATE public.co_carer_invites
SET permissions = permissions || '{"can_manage_pet_records": false}'::jsonb
WHERE NOT (permissions ? 'can_manage_pet_records');

ALTER TABLE public.pet_co_carers
  ALTER COLUMN permissions SET DEFAULT '{
    "can_log_activities": true,
    "can_edit_pet_profile": false,
    "can_manage_food": false,
    "can_manage_medications": false,
    "can_manage_vaccinations": false,
    "can_manage_vet_visits": false,
    "can_manage_pet_records": false
  }'::jsonb;

ALTER TABLE public.co_carer_invites
  ALTER COLUMN permissions SET DEFAULT '{
    "can_log_activities": true,
    "can_edit_pet_profile": false,
    "can_manage_food": false,
    "can_manage_medications": false,
    "can_manage_vaccinations": false,
    "can_manage_vet_visits": false,
    "can_manage_pet_records": false
  }'::jsonb;

-- ── 2. Table: pet_medical_record_uploads ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pet_medical_record_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_path text NOT NULL,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_medical_record_uploads_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_pet_medical_record_uploads_pet_created
  ON public.pet_medical_record_uploads (pet_id, created_at DESC);

ALTER TABLE public.pet_medical_record_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_medical_uploads_select" ON public.pet_medical_record_uploads;
CREATE POLICY "pet_medical_uploads_select"
  ON public.pet_medical_record_uploads FOR SELECT
  TO authenticated
  USING (public.can_access_pet(pet_id));

DROP POLICY IF EXISTS "pet_medical_uploads_insert" ON public.pet_medical_record_uploads;
CREATE POLICY "pet_medical_uploads_insert"
  ON public.pet_medical_record_uploads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_pet_permission(pet_id, 'can_manage_pet_records')
    AND auth.uid() = uploaded_by
  );

DROP POLICY IF EXISTS "pet_medical_uploads_update" ON public.pet_medical_record_uploads;
CREATE POLICY "pet_medical_uploads_update"
  ON public.pet_medical_record_uploads FOR UPDATE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_pet_records'))
  WITH CHECK (public.has_pet_permission(pet_id, 'can_manage_pet_records'));

DROP POLICY IF EXISTS "pet_medical_uploads_delete" ON public.pet_medical_record_uploads;
CREATE POLICY "pet_medical_uploads_delete"
  ON public.pet_medical_record_uploads FOR DELETE
  TO authenticated
  USING (public.has_pet_permission(pet_id, 'can_manage_pet_records'));

-- ── 3. Storage bucket (private — app uses signed URLs) ──────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-records', 'medical-records', false)
ON CONFLICT (id) DO UPDATE SET public = excluded.public;

DROP POLICY IF EXISTS "Medical records read" ON storage.objects;
CREATE POLICY "Medical records read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'medical-records'
    AND public.can_access_pet((split_part(name, '/', 1))::uuid)
  );

DROP POLICY IF EXISTS "Medical records insert" ON storage.objects;
CREATE POLICY "Medical records insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'medical-records'
    AND public.has_pet_permission((split_part(name, '/', 1))::uuid, 'can_manage_pet_records')
  );

DROP POLICY IF EXISTS "Medical records delete" ON storage.objects;
CREATE POLICY "Medical records delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'medical-records'
    AND public.has_pet_permission((split_part(name, '/', 1))::uuid, 'can_manage_pet_records')
  );
