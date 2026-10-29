-- Keep private attachments linked to the correct pet and record. Existing legacy
-- storage paths remain readable; validation applies to new attachments only.
UPDATE storage.buckets SET file_size_limit = 26214400 WHERE id = 'medical-records';

CREATE TABLE IF NOT EXISTS public.medical_record_storage_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'deletion' CHECK (reason IN ('deletion', 'unlinked_upload'))
);
ALTER TABLE public.medical_record_storage_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.medical_record_storage_deletions FROM anon, authenticated;
GRANT SELECT, DELETE ON public.medical_record_storage_deletions TO service_role;

CREATE OR REPLACE FUNCTION public.queue_medical_record_storage_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.medical_record_storage_deletions(storage_path)
  VALUES (OLD.storage_path) ON CONFLICT (storage_path) DO UPDATE
    SET reason = 'deletion', ready_at = now();
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS medical_record_file_deleted ON public.pet_medical_record_files;
CREATE TRIGGER medical_record_file_deleted
  AFTER DELETE ON public.pet_medical_record_files
  FOR EACH ROW EXECUTE FUNCTION public.queue_medical_record_storage_deletion();

CREATE OR REPLACE FUNCTION public.validate_medical_record_attachment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE expected_prefix text;
BEGIN
  SELECT pet_id::text || '/' || id::text || '/' || NEW.id::text || '/'
    INTO expected_prefix FROM public.pet_medical_records WHERE id = NEW.medical_record_id;
  IF expected_prefix IS NULL OR NOT starts_with(NEW.storage_path, expected_prefix)
      OR length(NEW.storage_path) <= length(expected_prefix)
      OR array_length(string_to_array(NEW.storage_path, '/'), 1) <> 4 THEN
    RAISE EXCEPTION 'Attachment storage path does not match its pet and record';
  END IF;
  IF EXISTS (SELECT 1 FROM public.medical_record_storage_deletions
      WHERE storage_path = NEW.storage_path AND (reason = 'deletion' OR ready_at <= now())) THEN
    RAISE EXCEPTION 'This attachment is pending deletion; choose the file again';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'medical-records' AND name = NEW.storage_path) THEN
    RAISE EXCEPTION 'Upload the attachment before saving its metadata';
  END IF;
  DELETE FROM public.medical_record_storage_deletions
    WHERE storage_path = NEW.storage_path AND reason = 'unlinked_upload';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_medical_record_attachment ON public.pet_medical_record_files;
CREATE TRIGGER validate_medical_record_attachment
  BEFORE INSERT ON public.pet_medical_record_files
  FOR EACH ROW EXECUTE FUNCTION public.validate_medical_record_attachment();

CREATE OR REPLACE FUNCTION public.guard_medical_record_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.pet_id IS DISTINCT FROM OLD.pet_id
      OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Medical record identity cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_medical_record_identity ON public.pet_medical_records;
CREATE TRIGGER guard_medical_record_identity
  BEFORE UPDATE ON public.pet_medical_records
  FOR EACH ROW EXECUTE FUNCTION public.guard_medical_record_identity();

-- Metadata rows are immutable. File changes create a new object and row.
CREATE OR REPLACE FUNCTION public.guard_medical_record_file_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Medical record attachments cannot be changed; upload a new file';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_medical_record_file_identity ON public.pet_medical_record_files;
CREATE TRIGGER guard_medical_record_file_identity
  BEFORE UPDATE ON public.pet_medical_record_files
  FOR EACH ROW EXECUTE FUNCTION public.guard_medical_record_file_identity();

ALTER TABLE public.pet_medical_record_files DROP CONSTRAINT IF EXISTS medical_record_file_size;
ALTER TABLE public.pet_medical_record_files ADD CONSTRAINT medical_record_file_size
  CHECK (file_size_bytes IS NOT NULL AND file_size_bytes > 0 AND file_size_bytes <= 26214400) NOT VALID;

DROP POLICY IF EXISTS "Medical records insert" ON storage.objects;
CREATE POLICY "Medical records insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'medical-records'
  AND array_length(string_to_array(name, '/'), 1) = 4

  AND EXISTS (
    SELECT 1 FROM public.pet_medical_records r
    WHERE r.id::text = split_part(name, '/', 2)
      AND r.pet_id::text = split_part(name, '/', 1)
      AND public.has_pet_permission(r.pet_id, 'can_manage_pet_records')
  )
);

REVOKE ALL ON FUNCTION public.queue_medical_record_storage_deletion() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_medical_record_attachment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_medical_record_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_medical_record_file_identity() FROM PUBLIC;

-- Queue new bytes before the client writes metadata. A crash/offline failure
-- cannot leave an unlinked object forever; linking cancels this delayed event.
CREATE OR REPLACE FUNCTION public.queue_unlinked_medical_record_upload()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.bucket_id = 'medical-records' THEN
    INSERT INTO public.medical_record_storage_deletions(storage_path, reason, ready_at)
    VALUES (NEW.name, 'unlinked_upload', now() + interval '24 hours')
    ON CONFLICT (storage_path) DO UPDATE SET ready_at = EXCLUDED.ready_at
      WHERE medical_record_storage_deletions.reason = 'unlinked_upload';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS queue_unlinked_medical_record_upload ON storage.objects;
CREATE TRIGGER queue_unlinked_medical_record_upload AFTER INSERT ON storage.objects
  FOR EACH ROW EXECUTE FUNCTION public.queue_unlinked_medical_record_upload();
REVOKE ALL ON FUNCTION public.queue_unlinked_medical_record_upload() FROM PUBLIC;
CREATE INDEX IF NOT EXISTS medical_record_storage_deletions_ready_at
  ON public.medical_record_storage_deletions(ready_at);
