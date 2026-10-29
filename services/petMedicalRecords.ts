import { supabase } from "@/lib/supabase";
import { shareLocalMedicalRecord } from "@/services/medicalRecordFileActions";
import { runNativeFileTransfer } from "@/lib/nativeFileTransfer";
import { sessionGeneration } from "@/lib/sessionGeneration";
import {
  medicalRecordPreviewCacheDirectory,
  pruneMedicalRecordPreviewCache,
} from "@/lib/medicalRecordPreviewCache";
import {
  medicalRecordContentType,
  medicalRecordFileName,
  validateMedicalRecordFileSize,
} from "@/utils/medicalRecordFiles";
import { trackMedicalRecordAdded } from "@/lib/analytics";
import type { PetMedicalRecord, PetMedicalRecordFile } from "@/types/database";
import { randomUUID } from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";

export const MEDICAL_RECORDS_BUCKET = "medical-records";

function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/[/\\]+/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const trimmed = base.slice(0, 180);
  return trimmed.length > 0 ? trimmed : "file";
}

/** Title shown in the app — default from filename without extension. */
export function defaultTitleFromFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) return trimmed || "Untitled";
  return trimmed.slice(0, lastDot).replace(/_/g, " ").trim() || "Untitled";
}

export function randomUploadId(): string {
  return randomUUID();
}

function extensionForUploadFilename(
  filename: string,
  contentType: string,
): string {
  const dot = filename.lastIndexOf(".");
  if (dot > 0 && dot < filename.length - 1) {
    return filename.slice(dot).toLowerCase();
  }
  const ct = contentType.toLowerCase();
  if (ct.includes("pdf")) return ".pdf";
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("heic")) return ".heic";
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  return "";
}

/**
 * Normalize whatever URI the picker hands us into a stable `file://` path that
 * `FileSystem.uploadAsync` can stream. iOS pickers usually already return `file://`,
 * but `ph://`, `content://`, `assets-library://`, and remote `https://` URIs need
 * to be materialized to disk so the upload path is the same in every case.
 */
async function ensureLocalFileUri(
  sourceUri: string,
  filename: string,
  contentType: string,
): Promise<{ fileUri: string; copied: boolean }> {
  if (sourceUri.startsWith("file://")) {
    return { fileUri: sourceUri, copied: false };
  }

  const ext = extensionForUploadFilename(filename, contentType);
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Cache directory unavailable on this device.");
  }
  const target = `${cacheDir}medical-upload-${randomUUID()}${ext}`;

  if (sourceUri.startsWith("http://") || sourceUri.startsWith("https://")) {
    const dl = await FileSystem.downloadAsync(sourceUri, target);
    if (dl.status < 200 || dl.status >= 300) {
      throw new Error(`Could not download file (HTTP ${dl.status}).`);
    }
    return { fileUri: dl.uri, copied: true };
  }

  try {
    await FileSystem.copyAsync({ from: sourceUri, to: target });
    return { fileUri: target, copied: true };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not read the selected file. Try picking it again. (${detail})`,
    );
  }
}

async function safeDeleteCachedUpload(fileUri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch {
    /* best-effort cleanup */
  }
}

async function resolveUploadByteLength(fileUri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists && typeof info.size === "number" && info.size > 0) {
    return info.size;
  }
  throw new Error("Could not determine file size. Try picking it again.");
}

/**
 * Maps native upload failures to a short, user-readable string. Surfaces the
 * common iOS/Android transport errors (EMSGSIZE, timeouts, no internet)
 * explicitly so users can act, instead of seeing the raw `NSPOSIXErrorDomain`.
 */
function describeUploadFailure(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const msg = raw.toLowerCase();
  if (msg.includes("message too long") || msg.includes("emsgsize")) {
    return "The upload connection was rejected by the network. Try again on a stronger connection.";
  }
  if (msg.includes("timed out") || msg.includes("timeout")) {
    return "The upload timed out. Please try again.";
  }
  if (
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("connection")
  ) {
    return "Network error while uploading. Check your connection and try again.";
  }
  return raw || "Upload failed. Please try again.";
}

export async function fetchPetMedicalRecords(
  petId: string,
): Promise<PetMedicalRecord[]> {
  const { data, error } = await supabase
    .from("pet_medical_records")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetMedicalRecord[];
}

export async function fetchPetMedicalRecordFileCounts(
  petId: string,
): Promise<Map<string, number>> {
  return (await fetchPetMedicalRecordsList(petId)).fileCounts;
}

/** One relational query; aggregate counts do not download every attachment row. */
export async function fetchPetMedicalRecordsList(petId: string): Promise<{
  records: PetMedicalRecord[];
  fileCounts: Map<string, number>;
}> {
  const { data, error } = await supabase
    .from("pet_medical_records")
    .select("*, pet_medical_record_files(count)")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const records: PetMedicalRecord[] = [];
  const fileCounts = new Map<string, number>();
  for (const row of data ?? []) {
    const { pet_medical_record_files: counts, ...record } = row;
    records.push(record as PetMedicalRecord);
    fileCounts.set(record.id, counts?.[0]?.count ?? 0);
  }
  return { records, fileCounts };
}

export async function fetchPetMedicalRecordDetail(
  recordId: string,
): Promise<{ record: PetMedicalRecord; files: PetMedicalRecordFile[] }> {
  const { data, error } = await supabase
    .from("pet_medical_records")
    .select("*, pet_medical_record_files(*)")
    .eq("id", recordId)
    .single();

  if (error) throw error;
  const { pet_medical_record_files: files, ...record } = data;

  return {
    record: record as PetMedicalRecord,
    files: ((files ?? []) as PetMedicalRecordFile[]).sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    ),
  };
}

export async function createPetMedicalRecord(
  petId: string,
  userId: string,
  title: string,
  recordId?: string,
): Promise<PetMedicalRecord> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");

  const { data, error } = await supabase
    .from("pet_medical_records")
    .insert({
      ...(recordId ? { id: recordId } : {}),
      pet_id: petId,
      created_by: userId,
      title: trimmed,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PetMedicalRecord;
}

export type UploadMedicalRecordFileInput = {
  /** Stable picker ID makes retrying a lost response safe. */
  fileId?: string;
  petId: string;
  medicalRecordId: string;
  userId: string;
  localUri: string;
  originalFilename: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

/**
 * Uploads one file to Storage and inserts `pet_medical_record_files`.
 *
 * Path layout: `{petId}/{medicalRecordId}/{fileId}/{safeFileName}` — pet/record prefixes
 * matter for the storage RLS policies on the `medical-records` bucket.
 *
 * Transport: every file (image, PDF, doc, …) goes through `createSignedUploadUrl` +
 * `FileSystem.uploadAsync`. We force a foreground iOS `URLSession` because the default
 * background task throws `NSPOSIXErrorDomain Code=40 "Message too long"` (EMSGSIZE) for
 * Supabase signed URLs, and JS `fetch` with an `ArrayBuffer` body fails fast with
 * "Network request failed" on RN for non-trivial payloads. Foreground + streaming-from-disk
 * is the only path that has been reliable across image/photo/PDF inputs.
 */
export async function uploadFileToMedicalRecord(
  input: UploadMedicalRecordFileInput,
): Promise<PetMedicalRecordFile> {
  const fileId = input.fileId ?? randomUUID();
  if (input.fileId) {
    const { data: existing, error } = await supabase
      .from("pet_medical_record_files")
      .select("*")
      .eq("id", fileId)
      .eq("medical_record_id", input.medicalRecordId)
      .maybeSingle();
    if (error) throw error;
    if (existing) return existing as PetMedicalRecordFile;
  }
  const safeName = sanitizeStorageFileName(input.originalFilename);
  const storagePath = `${input.petId}/${input.medicalRecordId}/${fileId}/${safeName}`;

  const contentType = medicalRecordContentType(
    input.originalFilename,
    input.mimeType,
  );

  const { fileUri, copied } = await ensureLocalFileUri(
    input.localUri,
    input.originalFilename,
    contentType,
  );

  let storageObjectCreated = false;
  let uploadAttempted = false;

  try {
    const fileSizeBytes = await resolveUploadByteLength(fileUri);
    validateMedicalRecordFileSize(fileSizeBytes);
    // A previous upload may have reached Storage without its response reaching
    // the device. The metadata lookup above confirmed this stable ID is unlinked.
    if (input.fileId) {
      const { error } = await supabase.storage
        .from(MEDICAL_RECORDS_BUCKET)
        .remove([storagePath]);
      if (error) throw error;
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from(MEDICAL_RECORDS_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (signErr) {
      throw new Error(
        signErr.message ||
          "Could not start the upload. Please try again in a moment.",
      );
    }

    let uploadResult: FileSystem.FileSystemUploadResult;
    try {
      const task = FileSystem.createUploadTask(signed.signedUrl, fileUri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "max-age=3600",
        },
      });
      uploadAttempted = true;
      const result = await runNativeFileTransfer(
        () => task.uploadAsync(),
        () => task.cancelAsync(),
      );
      if (!result) throw new Error("Upload cancelled. Try again.");
      uploadResult = result;
    } catch (e) {
      throw new Error(describeUploadFailure(e));
    }

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      const detail = uploadResult.body?.trim();
      throw new Error(
        detail && detail.length > 0
          ? detail.slice(0, 500)
          : `Upload failed (HTTP ${uploadResult.status}). Please try again.`,
      );
    }
    storageObjectCreated = true;

    const { data: row, error: insErr } = await supabase
      .from("pet_medical_record_files")
      .insert({
        id: fileId,
        medical_record_id: input.medicalRecordId,
        storage_path: storagePath,
        original_filename: input.originalFilename,
        mime_type: contentType,
        file_size_bytes: fileSizeBytes,
      })
      .select()
      .single();

    if (insErr) {
      throw insErr;
    }

    return row as PetMedicalRecordFile;
  } catch (err) {
    // An insert can commit even when its HTTP response is lost. Never delete a
    // successfully linked object or re-upload it on the next attempt.
    if (uploadAttempted) {
      const { data: committed, error: lookupError } = await supabase
        .from("pet_medical_record_files")
        .select("*")
        .eq("id", fileId)
        .eq("medical_record_id", input.medicalRecordId)
        .maybeSingle();
      if (committed) return committed as PetMedicalRecordFile;
      // If commit status is unknown, leave the bytes intact. Retry reconciles
      // metadata before attempting removal so a saved file is never destroyed.
      if (lookupError) throw err;
    }
    if (storageObjectCreated || uploadAttempted) {
      try {
        await supabase.storage
          .from(MEDICAL_RECORDS_BUCKET)
          .remove([storagePath]);
      } catch {
        /* best-effort orphan cleanup */
      }
    }
    throw err;
  } finally {
    if (copied) {
      void safeDeleteCachedUpload(fileUri);
    }
  }
}

export async function createPetMedicalRecordWithFiles(
  petId: string,
  userId: string,
  recordTitle: string,
  files: Omit<
    UploadMedicalRecordFileInput,
    "petId" | "medicalRecordId" | "userId"
  >[],
  existingRecordId?: string,
): Promise<PetMedicalRecord> {
  if (files.length === 0) {
    throw new Error("Add at least one file.");
  }
  const title =
    recordTitle.trim() || defaultTitleFromFileName(files[0]!.originalFilename);
  let record: PetMedicalRecord;
  if (existingRecordId) {
    const { data, error } = await supabase
      .from("pet_medical_records")
      .select("*")
      .eq("id", existingRecordId)
      .maybeSingle();
    if (error) throw error;
    if (data && data.pet_id !== petId)
      throw new Error("This record belongs to another pet.");
    record =
      (data as PetMedicalRecord) ??
      (await createPetMedicalRecord(petId, userId, title, existingRecordId));
    if (record.title !== title)
      await updatePetMedicalRecordTitle(record.id, title);
  } else {
    record = await createPetMedicalRecord(petId, userId, title);
  }
  await uploadMedicalRecordFiles(petId, record.id, userId, files);
  trackMedicalRecordAdded(files.length);
  return record;
}

export class MedicalRecordUploadError extends Error {
  constructor(
    public recordId: string,
    public uploadedFileIds: string[],
    message: string,
  ) {
    super(message);
    this.name = "MedicalRecordUploadError";
  }
}

export async function uploadMedicalRecordFiles(
  petId: string,
  recordId: string,
  userId: string,
  files: Omit<
    UploadMedicalRecordFileInput,
    "petId" | "medicalRecordId" | "userId"
  >[],
): Promise<void> {
  const uploadedFileIds: string[] = [];
  for (const file of files) {
    try {
      const uploaded = await uploadFileToMedicalRecord({
        ...file,
        petId,
        medicalRecordId: recordId,
        userId,
      });
      uploadedFileIds.push(uploaded.id);
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "Upload failed. Check your connection.";
      throw new MedicalRecordUploadError(
        recordId,
        uploadedFileIds,
        `${reason} Your saved files are kept in this record. Retry to upload only the remaining files.`,
      );
    }
  }
}

export async function deleteMedicalRecordFile(
  file: PetMedicalRecordFile,
): Promise<void> {
  const { error: delErr } = await supabase
    .from("pet_medical_record_files")
    .delete()
    .eq("id", file.id)
    .select("id")
    .single();

  if (delErr) throw delErr;
  // The transaction queued a durable retry before any bytes are removed.
  // A temporary storage failure must not restore a deleted attachment in the UI.
  await supabase.storage
    .from(MEDICAL_RECORDS_BUCKET)
    .remove([file.storage_path])
    .catch(() => {});
}

export async function deletePetMedicalRecord(recordId: string): Promise<void> {
  const { data: files, error: fErr } = await supabase
    .from("pet_medical_record_files")
    .select("storage_path")
    .eq("medical_record_id", recordId);

  if (fErr) throw fErr;

  const paths = (files ?? []).map((f) => f.storage_path as string);
  const { error: delErr } = await supabase
    .from("pet_medical_records")
    .delete()
    .eq("id", recordId)
    .select("id")
    .single();

  if (delErr) throw delErr;
  for (let offset = 0; offset < paths.length; offset += 100) {
    await supabase.storage
      .from(MEDICAL_RECORDS_BUCKET)
      .remove(paths.slice(offset, offset + 100))
      .catch(() => {});
  }
}

export async function updatePetMedicalRecordTitle(
  recordId: string,
  title: string,
): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");

  const { error } = await supabase
    .from("pet_medical_records")
    .update({ title: trimmed })
    .eq("id", recordId)
    .select("id")
    .single();

  if (error) throw error;
}

function medicalRecordsServeUrl(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/functions/v1/serve-medical-record-file`;
}

/**
 * Downloads via authenticated Edge Function (avoids opening a Supabase Storage URL in the browser)
 * and returns a local `file://` URI for the OS document/PDF preview.
 */
export async function downloadMedicalRecordFileForOpening(
  file: Pick<PetMedicalRecordFile, "id" | "mime_type" | "original_filename"> &
    Partial<Pick<PetMedicalRecordFile, "file_size_bytes">>,
): Promise<string> {
  const generation = sessionGeneration();
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Sign in required.");

  // Isolate each preview's read access and retain the filename in exported files.
  // Concurrent downloads never overwrite a document currently open in another app.
  await pruneMedicalRecordPreviewCache().catch(() => {});
  const directory = `${medicalRecordPreviewCacheDirectory()}${Date.now()}-${randomUUID()}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const type = medicalRecordContentType(
    file.original_filename ?? "",
    file.mime_type,
  );
  const dest = `${directory}${encodeURIComponent(medicalRecordFileName(file.original_filename ?? "document", type))}`;

  const url = `${medicalRecordsServeUrl()}?file_id=${encodeURIComponent(file.id)}`;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  const task = FileSystem.createDownloadResumable(url, dest, {
    sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });

  try {
    const result = await runNativeFileTransfer(
      () => task.downloadAsync(),
      () => task.cancelAsync(),
    );
    if (!result) throw new Error("Download cancelled. Try again.");
    if (result.status !== 200) {
      let message = `Could not load file (${result.status}).`;
      try {
        const txt = await FileSystem.readAsStringAsync(dest);
        const parsed = JSON.parse(txt) as { message?: string; error?: string };
        message =
          (typeof parsed.message === "string" && parsed.message.trim()) ||
          (typeof parsed.error === "string" && parsed.error.trim()) ||
          message;
      } catch {
        /* ignore non-JSON error bodies */
      }
      throw new Error(message);
    }
    const info = await FileSystem.getInfoAsync(result.uri);
    if (
      !info.exists ||
      !info.size ||
      (file.file_size_bytes != null && info.size !== file.file_size_bytes)
    ) {
      throw new Error("The downloaded file is incomplete. Please try again.");
    }
    if (generation !== sessionGeneration())
      throw new Error("Your account changed. Open this file again.");

    return result.uri;
  } catch (error) {
    await FileSystem.deleteAsync(directory, { idempotent: true }).catch(
      () => {},
    );
    throw error;
  }
}

/**
 * Opens the OS share sheet for a medical file (same downloaded copy used for preview).
 */
export async function shareMedicalRecordFile(
  file: Pick<PetMedicalRecordFile, "id" | "mime_type" | "original_filename">,
): Promise<void> {
  const localUri = await downloadMedicalRecordFileForOpening(file);
  await shareLocalMedicalRecord(
    localUri,
    medicalRecordContentType(file.original_filename ?? "", file.mime_type),
  );
}

export async function createSignedMedicalRecordUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(MEDICAL_RECORDS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}
