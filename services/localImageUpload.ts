import * as FileSystem from "expo-file-system/legacy";

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Guess MIME type from file URI (expo-image-picker paths often include extension). */
export function inferImageContentType(uri: string): string {
  const u = uri.split("?")[0]?.toLowerCase() ?? "";
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
  if (u.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/** File extension for storage path (no dot). */
export function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("heic")) return "heic";
  return "jpg";
}

/**
 * Reads a local image URI (e.g. from expo-image-picker) into an ArrayBuffer.
 * Use this instead of fetch(uri).blob() — that often yields empty blobs on RN and uploads 0-byte files.
 */
export async function readLocalImageUriAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buffer = base64ToArrayBuffer(base64);
  if (buffer.byteLength === 0) {
    throw new Error("Could not read image file (empty). Try picking the photo again.");
  }
  return buffer;
}
