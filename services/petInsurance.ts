import { supabase } from "@/lib/supabase";
import {
  inferImageContentType,
  readLocalFileUriAsArrayBuffer,
} from "@/services/localImageUpload";
import type { PetInsuranceFile } from "@/types/database";
import { randomUUID } from "expo-crypto";

export const PET_INSURANCE_BUCKET = "pet-insurance";

function sanitizeStorageFileName(name: string): string {
  const base = name.replace(/[/\\]+/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  const trimmed = base.slice(0, 180);
  return trimmed.length > 0 ? trimmed : "file";
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

export async function fetchPetInsuranceFiles(
  petId: string,
): Promise<PetInsuranceFile[]> {
  const { data, error } = await supabase
    .from("pet_insurance_files")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetInsuranceFile[];
}

export type UploadPetInsuranceFileInput = {
  petId: string;
  userId: string;
  localUri: string;
  originalFilename: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
};

/**
 * Uploads one file to Storage and inserts pet_insurance_files.
 * Path: `{petId}/{fileId}/{safeFileName}`.
 */
export async function uploadPetInsuranceFile(
  input: UploadPetInsuranceFileInput,
): Promise<PetInsuranceFile> {
  const fileId = randomUUID();
  const safeName = sanitizeStorageFileName(input.originalFilename);
  const storagePath = `${input.petId}/${fileId}/${safeName}`;

  const buffer = await readUriAsArrayBuffer(input.localUri);
  const contentType = resolveUploadContentType(
    input.localUri,
    input.mimeType,
    input.originalFilename,
  );

  const { error: upErr } = await supabase.storage
    .from(PET_INSURANCE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (upErr) throw upErr;

  const { data: row, error: insErr } = await supabase
    .from("pet_insurance_files")
    .insert({
      id: fileId,
      pet_id: input.petId,
      uploaded_by: input.userId,
      storage_path: storagePath,
      original_filename: input.originalFilename,
      mime_type: contentType,
      file_size_bytes: input.fileSizeBytes ?? buffer.byteLength,
    })
    .select()
    .single();

  if (insErr) {
    await supabase.storage.from(PET_INSURANCE_BUCKET).remove([storagePath]);
    throw insErr;
  }

  return row as PetInsuranceFile;
}

export async function deletePetInsuranceFile(
  file: PetInsuranceFile,
): Promise<void> {
  const { error: stErr } = await supabase.storage
    .from(PET_INSURANCE_BUCKET)
    .remove([file.storage_path]);
  if (stErr) throw stErr;

  const { error: delErr } = await supabase
    .from("pet_insurance_files")
    .delete()
    .eq("id", file.id);

  if (delErr) throw delErr;
}

export async function createSignedPetInsuranceUrl(
  storagePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PET_INSURANCE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}
