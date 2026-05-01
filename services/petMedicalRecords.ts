import { supabase } from "@/lib/supabase";
import { inferImageContentType } from "@/services/localImageUpload";
import type {
  PetMedicalRecord,
  PetMedicalRecordFile,
} from "@/types/database";
import { randomUUID } from "expo-crypto";
import * as Sharing from "expo-sharing";
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

function resolveUploadContentType(
  uri: string,
  mime: string | null,
  filename: string,
): string {
  if (mime?.trim()) return mime.trim();
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "image/heic";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return inferImageContentType(uri);
}

function extensionForUploadFilename(filename: string, contentType: string): string {
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

async function resolveUploadByteLength(
  fileUri: string,
  fileSizeHint: number | null,
): Promise<number> {
  if (typeof fileSizeHint === "number" && fileSizeHint > 0) {
    return fileSizeHint;
  }
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
  const { data: records, error: rErr } = await supabase
    .from("pet_medical_records")
    .select("id")
    .eq("pet_id", petId);

  if (rErr) throw rErr;
  const ids = (records ?? []).map((r) => r.id as string);
  if (ids.length === 0) return new Map();

  const { data: rows, error: cErr } = await supabase
    .from("pet_medical_record_files")
    .select("medical_record_id")
    .in("medical_record_id", ids);

  if (cErr) throw cErr;
  const counts = new Map<string, number>();
  for (const id of ids) counts.set(id, 0);
  for (const row of rows ?? []) {
    const mid = row.medical_record_id as string;
    counts.set(mid, (counts.get(mid) ?? 0) + 1);
  }
  return counts;
}

export async function fetchPetMedicalRecordDetail(
  recordId: string,
): Promise<{ record: PetMedicalRecord; files: PetMedicalRecordFile[] }> {
  const { data: record, error: rErr } = await supabase
    .from("pet_medical_records")
    .select("*")
    .eq("id", recordId)
    .single();

  if (rErr) throw rErr;

  const { data: files, error: fErr } = await supabase
    .from("pet_medical_record_files")
    .select("*")
    .eq("medical_record_id", recordId)
    .order("created_at", { ascending: true });

  if (fErr) throw fErr;

  return {
    record: record as PetMedicalRecord,
    files: (files ?? []) as PetMedicalRecordFile[],
  };
}

export async function createPetMedicalRecord(
  petId: string,
  userId: string,
  title: string,
): Promise<PetMedicalRecord> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title is required");

  const { data, error } = await supabase
    .from("pet_medical_records")
    .insert({
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
  const fileId = randomUUID();
  const safeName = sanitizeStorageFileName(input.originalFilename);
  const storagePath = `${input.petId}/${input.medicalRecordId}/${fileId}/${safeName}`;

  const contentType = resolveUploadContentType(
    input.localUri,
    input.mimeType,
    input.originalFilename,
  );

  const { fileUri, copied } = await ensureLocalFileUri(
    input.localUri,
    input.originalFilename,
    contentType,
  );

  let storageObjectCreated = false;

  try {
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
      uploadResult = await FileSystem.uploadAsync(signed.signedUrl, fileUri, {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "max-age=3600",
        },
      });
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

    const fileSizeBytes = await resolveUploadByteLength(
      fileUri,
      input.fileSizeBytes,
    );

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
    if (storageObjectCreated) {
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
  files: Omit<UploadMedicalRecordFileInput, "petId" | "medicalRecordId" | "userId">[],
): Promise<PetMedicalRecord> {
  if (files.length === 0) {
    throw new Error("Add at least one file.");
  }
  const title =
    recordTitle.trim() ||
    defaultTitleFromFileName(files[0]!.originalFilename);
  const record = await createPetMedicalRecord(petId, userId, title);

  /** Upload sequentially so an early failure leaves a deterministic state — partial
   *  successes are preserved (the record + already-uploaded files stay) and the
   *  caller surfaces the error so the user can retry the missing files. */
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    try {
      await uploadFileToMedicalRecord({
        petId,
        medicalRecordId: record.id,
        userId,
        ...f,
      });
    } catch (e) {
      const base = e instanceof Error ? e.message : "Upload failed.";
      const remaining = files.length - i;
      const which =
        remaining > 1 ? ` (${remaining} files were not uploaded)` : "";
      throw new Error(`${base}${which}`);
    }
  }
  return record;
}

export async function deleteMedicalRecordFile(
  file: PetMedicalRecordFile,
): Promise<void> {
  const { error: stErr } = await supabase.storage
    .from(MEDICAL_RECORDS_BUCKET)
    .remove([file.storage_path]);
  if (stErr) throw stErr;

  const { error: delErr } = await supabase
    .from("pet_medical_record_files")
    .delete()
    .eq("id", file.id);

  if (delErr) throw delErr;
}

export async function deletePetMedicalRecord(recordId: string): Promise<void> {
  const { data: files, error: fErr } = await supabase
    .from("pet_medical_record_files")
    .select("storage_path")
    .eq("medical_record_id", recordId);

  if (fErr) throw fErr;

  const paths = (files ?? []).map((f) => f.storage_path as string);
  if (paths.length > 0) {
    const { error: stErr } = await supabase.storage
      .from(MEDICAL_RECORDS_BUCKET)
      .remove(paths);
    if (stErr) throw stErr;
  }

  const { error: delErr } = await supabase
    .from("pet_medical_records")
    .delete()
    .eq("id", recordId);

  if (delErr) throw delErr;
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
    .eq("id", recordId);

  if (error) throw error;
}

function medicalRecordsServeUrl(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${base}/functions/v1/serve-medical-record-file`;
}

function viewerCacheFileExtension(
  file: Pick<PetMedicalRecordFile, "mime_type" | "original_filename">,
): string {
  const name = file.original_filename?.trim() ?? "";
  const match = /\.([a-zA-Z0-9]{1,12})$/.exec(name);
  if (match) return `.${match[1].toLowerCase()}`;
  const mime = file.mime_type?.toLowerCase() ?? "";
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime === "image/jpg") return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("heic")) return ".heic";
  return "";
}

/**
 * Downloads via authenticated Edge Function (avoids opening a Supabase Storage URL in the browser)
 * and returns a local `file://` URI for the OS document/PDF preview.
 */
export async function downloadMedicalRecordFileForOpening(
  file: Pick<PetMedicalRecordFile, "id" | "mime_type" | "original_filename">,
): Promise<string> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Sign in required.");

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("Device cache is unavailable.");

  const ext = viewerCacheFileExtension(file);
  const dest = `${cacheDir}medical-record-${file.id}${ext}`;

  const url = `${medicalRecordsServeUrl()}?file_id=${encodeURIComponent(file.id)}`;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  const result = await FileSystem.downloadAsync(url, dest, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });

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
    await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    throw new Error(message);
  }

  return result.uri;
}

/**
 * Opens the OS share sheet for a medical file (same downloaded copy used for preview).
 */
export async function shareMedicalRecordFile(
  file: Pick<
    PetMedicalRecordFile,
    "id" | "mime_type" | "original_filename"
  >,
): Promise<void> {
  const localUri = await downloadMedicalRecordFileForOpening(file);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn’t available on this device.");
  }
  await Sharing.shareAsync(localUri, {
    mimeType: file.mime_type?.trim() || undefined,
    dialogTitle: "Share document",
  });
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
