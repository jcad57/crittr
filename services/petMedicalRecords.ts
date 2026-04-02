import { supabase } from "@/lib/supabase";
import {
  inferImageContentType,
  readLocalFileUriAsArrayBuffer,
} from "@/services/localImageUpload";
import type {
  PetMedicalRecord,
  PetMedicalRecordFile,
} from "@/types/database";
import { randomUUID } from "expo-crypto";

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

function isDeviceLocalUri(uri: string): boolean {
  return (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://") ||
    uri.startsWith("assets-library://")
  );
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
  return inferImageContentType(uri);
}

async function readUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (isDeviceLocalUri(uri)) {
    return readLocalFileUriAsArrayBuffer(uri);
  }
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Could not read file (${res.status})`);
  }
  const blob = await res.blob();
  const buffer = await blob.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error("Could not read file (empty). Try picking again.");
  }
  return buffer;
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
 * Uploads one file to Storage and inserts pet_medical_record_files.
 * Path: `{petId}/{medicalRecordId}/{fileId}/{safeFileName}`.
 */
export async function uploadFileToMedicalRecord(
  input: UploadMedicalRecordFileInput,
): Promise<PetMedicalRecordFile> {
  const fileId = randomUUID();
  const safeName = sanitizeStorageFileName(input.originalFilename);
  const storagePath = `${input.petId}/${input.medicalRecordId}/${fileId}/${safeName}`;

  const buffer = await readUriAsArrayBuffer(input.localUri);
  const contentType = resolveUploadContentType(
    input.localUri,
    input.mimeType,
    input.originalFilename,
  );

  const { error: upErr } = await supabase.storage
    .from(MEDICAL_RECORDS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (upErr) throw upErr;

  const { data: row, error: insErr } = await supabase
    .from("pet_medical_record_files")
    .insert({
      id: fileId,
      medical_record_id: input.medicalRecordId,
      storage_path: storagePath,
      original_filename: input.originalFilename,
      mime_type: contentType,
      file_size_bytes: input.fileSizeBytes ?? buffer.byteLength,
    })
    .select()
    .single();

  if (insErr) {
    await supabase.storage.from(MEDICAL_RECORDS_BUCKET).remove([storagePath]);
    throw insErr;
  }

  return row as PetMedicalRecordFile;
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
  for (const f of files) {
    await uploadFileToMedicalRecord({
      petId,
      medicalRecordId: record.id,
      userId,
      ...f,
    });
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
