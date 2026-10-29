-- Read-only inventory. Run as an administrator; review results before repair.
-- Use the Storage API, never direct SQL deletion of storage.objects, for cleanup.

-- Historical objects with no attachment metadata and an elapsed grace period.
SELECT o.name, o.created_at
FROM storage.objects o
LEFT JOIN public.pet_medical_record_files f ON f.storage_path = o.name
WHERE o.bucket_id = 'medical-records'
  AND f.id IS NULL AND o.created_at < now() - interval '24 hours'
ORDER BY o.created_at;

-- Saved attachments whose bytes are missing (requires restore/re-upload).
SELECT f.id, r.pet_id, f.medical_record_id, f.storage_path
FROM public.pet_medical_record_files f
JOIN public.pet_medical_records r ON r.id = f.medical_record_id
LEFT JOIN storage.objects o ON o.bucket_id = 'medical-records' AND o.name = f.storage_path
WHERE o.id IS NULL;

-- Due cleanup backlog; pending uploads inside their grace period are excluded.
SELECT reason, count(*) AS due_objects, min(ready_at) AS oldest_due
FROM public.medical_record_storage_deletions
WHERE ready_at <= now()
GROUP BY reason;
