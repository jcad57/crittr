import { supabase } from "@/lib/supabase";
import type { MedicationDosePeriod } from "@/types/database";

/**
 * One candidate medication extracted from an uploaded medical document.
 * `duplicate_of_id` is set server-side when the candidate normalizes to an existing
 * `pet_medications` row; the review sheet uses this to offer "Update existing" instead
 * of creating a second entry.
 */
export type ExtractedMedication = {
  name: string;
  dosage: string | null;
  frequency: string | null;
  condition: string | null;
  notes: string | null;
  doses_per_period: number | null;
  dose_period: MedicationDosePeriod | null;
  interval_count: number | null;
  interval_unit: MedicationDosePeriod | null;
  last_given_on: string | null;
  next_due_date: string | null;
  confidence: "low" | "medium" | "high";
  duplicate_of_id: string | null;
};

export type ExtractedVaccination = {
  name: string;
  administered_on: string | null;
  expires_on: string | null;
  frequency_label: string | null;
  administered_by: string | null;
  lot_number: string | null;
  notes: string | null;
  confidence: "low" | "medium" | "high";
  duplicate_of_id: string | null;
};

export type ParseMedicalRecordResult = {
  pet_id: string;
  pet_name: string | null;
  /** What the AI read as the pet's name on the doc — may be null or a different spelling. */
  pet_name_detected: string | null;
  medications: ExtractedMedication[];
  vaccinations: ExtractedVaccination[];
  /** Files that could not be scanned (too large, unsupported type, storage error). */
  warnings: { filename: string; reason: string }[];
};

async function extractInvokeErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object") {
    const e = error as { message?: string; name?: string; context?: unknown };
    if (e.context instanceof Response) {
      try {
        const j = (await e.context.json()) as Record<string, unknown>;
        if (typeof j.message === "string") return j.message;
        if (typeof j.error === "string") return j.error;
      } catch {
        /* body consumed */
      }
    }
    if (typeof e.message === "string" && e.message.length > 0) {
      /** "Network request failed" / AbortError almost always means the scan took longer than the
       *  client-side fetch ceiling — surface that explicitly so users retry instead of blaming Wi-Fi. */
      const msg = e.message;
      const isAbort =
        e.name === "AbortError" ||
        /aborted/i.test(msg) ||
        /network request failed/i.test(msg);
      if (isAbort) {
        return "Scanning this document took longer than expected. Try again, or split large PDFs into smaller files.";
      }
      return msg;
    }
  }
  return "Couldn't scan the document. Please try again.";
}

export async function parseMedicalRecord(params: {
  petId: string;
  medicalRecordId: string;
  /** Optional — scan only these files within the record. Omit to scan all files. */
  fileIds?: string[];
}): Promise<ParseMedicalRecordResult> {
  /** The long-running ceiling is enforced in `lib/supabase.ts#fetchWithTimeout`
   *  (150s for `/functions/v1/`). `functions.invoke` ignores any `timeout` option
   *  in supabase-js v2, so we don't pass one here. */
  const { data, error } = await supabase.functions.invoke(
    "parse-medical-record",
    {
      body: {
        pet_id: params.petId,
        medical_record_id: params.medicalRecordId,
        file_ids: params.fileIds,
      },
    },
  );

  const payload = data as
    | (Partial<ParseMedicalRecordResult> & {
        error?: string;
        message?: string;
      })
    | null;

  if (error) {
    const fromBody =
      typeof payload?.message === "string" && payload.message.length > 0
        ? payload.message
        : null;
    throw new Error(fromBody ?? (await extractInvokeErrorMessage(error)));
  }

  if (payload?.error) {
    const msg =
      typeof payload.message === "string" ? payload.message : payload.error;
    throw new Error(msg);
  }

  if (
    !payload ||
    typeof payload.pet_id !== "string" ||
    !Array.isArray(payload.medications) ||
    !Array.isArray(payload.vaccinations)
  ) {
    throw new Error("The document scanner returned an unexpected response.");
  }

  return {
    pet_id: payload.pet_id,
    pet_name: payload.pet_name ?? null,
    pet_name_detected: payload.pet_name_detected ?? null,
    medications: payload.medications,
    vaccinations: payload.vaccinations,
    warnings: payload.warnings ?? [],
  };
}
