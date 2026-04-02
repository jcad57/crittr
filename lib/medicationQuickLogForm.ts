import type {
  MedicationActivityFormData,
  PetMedication,
} from "@/types/database";

/** Matches `MedicationDetailStep` / pet medication editor unit list. */
const MED_ACTIVITY_UNITS = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
] as const;

function normalizeUnit(raw: string): string {
  const t = raw.trim();
  if (!t) return "Tablet";
  const found = MED_ACTIVITY_UNITS.find(
    (u) => u.toLowerCase() === t.toLowerCase(),
  );
  return found ?? "Tablet";
}

/**
 * Derive amount + unit for logging a dose from the profile `dosage` string
 * (e.g. "2 Tablet", "1 injection") for one-tap "mark done" on Health.
 */
export function medicationActivityFormForQuickLog(
  m: PetMedication,
): MedicationActivityFormData {
  const dosage = m.dosage?.trim() ?? "";
  let amount = "1";
  let unit: string = "Tablet";

  if (dosage) {
    const parts = dosage.split(/\s+/);
    if (parts.length === 1) {
      const p = parts[0];
      if (/^\d/.test(p)) {
        amount = p;
      } else {
        unit = normalizeUnit(p);
      }
    } else {
      const [first, ...rest] = parts;
      const joined = rest.join(" ");
      const exact = MED_ACTIVITY_UNITS.find(
        (u) => u.toLowerCase() === joined.toLowerCase(),
      );
      if (exact) {
        amount = /^\d/.test(first) ? first : "1";
        unit = exact;
      } else if (rest[0]) {
        const u = MED_ACTIVITY_UNITS.find(
          (x) => x.toLowerCase() === rest[0].toLowerCase(),
        );
        if (u) {
          amount = /^\d/.test(first) ? first : "1";
          unit = u;
        } else if (/^\d/.test(first)) {
          amount = first;
        }
      } else if (/^\d/.test(first)) {
        amount = first;
      }
    }
  }

  return {
    medicationId: m.id,
    medicationName: m.name.trim(),
    amount,
    unit,
    notes: "",
  };
}
