/** Keep this limit in sync with the private medical-records bucket. */
export const MAX_MEDICAL_RECORD_FILE_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  bmp: "image/bmp",
  txt: "text/plain",
  csv: "text/csv",
  html: "text/html",
  htm: "text/html",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function medicalRecordContentType(
  filename: string,
  mime?: string | null,
): string {
  const normalized = mime?.split(";")[0].trim().toLowerCase();
  if (normalized && normalized !== "application/octet-stream")
    return normalized;
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}

export function medicalRecordFileName(
  filename: string,
  mime?: string | null,
): string {
  const safe = filename
    .replace(/[/\\\x00-\x1f\x7f]/g, "_")
    .trim()
    .slice(-180);
  const name = safe && !/^\.+$/.test(safe) ? safe : "document";
  if (/\.[a-z0-9]{1,12}$/i.test(name)) return name;
  const ext = Object.keys(MIME_BY_EXTENSION).find(
    (key) => MIME_BY_EXTENSION[key] === mime,
  );
  return ext ? `${name}.${ext}` : name;
}

export function validateMedicalRecordFileSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error("This file is empty or cannot be read. Choose it again.");
  }
  if (size > MAX_MEDICAL_RECORD_FILE_BYTES) {
    throw new Error("Each medical record file must be 25 MB or smaller.");
  }
}

/** Android WebView cannot reliably render a PDF; offer the native open action. */
export function medicalRecordPreviewKind(
  filename: string,
  mime: string | null | undefined,
  platform: string,
) {
  const type = medicalRecordContentType(filename, mime);
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" && platform === "ios") return "web";
  if (type === "text/plain" || type === "text/csv") return "web";
  return "external";
}
