/**
 * Display helpers for file attachments shown in pet medical records and insurance UI.
 * Pure functions — safe to use anywhere.
 */

export function formatBytes(n: number | null): string {
  if (n == null || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024)
    return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function mimeKind(mime: string | null): "pdf" | "image" {
  if (!mime) return "image";
  if (mime === "application/pdf" || mime.includes("pdf")) return "pdf";
  return "image";
}
