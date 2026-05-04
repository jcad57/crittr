/**
 * Display helpers used by the pet medical-records list screen.
 * Pure functions — no side effects.
 */

import type { PetMedicalRecord, PetVaccination } from "@/types/database";

export function vetKindIcon(
  kind: "visit" | "vaccination",
): "needle" | "stethoscope" {
  return kind === "vaccination" ? "needle" : "stethoscope";
}

export function formatMediumDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function vaccinationDateLabel(v: PetVaccination): string {
  if (v.expires_on) {
    return `Expires ${new Date(`${v.expires_on}T12:00:00`).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    )}`;
  }
  return formatMediumDate(v.created_at);
}

export function buildVaccinationSummary(v: PetVaccination): string {
  if (v.frequency_label?.trim()) return v.frequency_label.trim();
  if (v.notes?.trim()) return v.notes.trim();
  return "Vaccination on file";
}

export function recordSubtitle(
  record: PetMedicalRecord,
  fileCount: number,
): string {
  const when = formatMediumDate(record.created_at);
  const fc = fileCount === 1 ? "1 file" : `${fileCount} files`;
  return `${fc} · ${when}`;
}
