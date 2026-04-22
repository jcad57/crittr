/**
 * Pure helpers that map a `PetMedication` row from the DB into the local
 * draft state used by the medication edit screen.
 */

import {
  DOSAGE_TYPES,
  type SchedulePeriod,
} from "@/constants/medicationEditForm";
import { parseReminderTimeHHmm } from "@/utils/medicationSchedule";
import type { MedicationDosePeriod, PetMedication } from "@/types/database";

export function lastGivenOnFromDb(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return raw.trim().split("T")[0].slice(0, 10);
}

export function splitDosage(
  dosage: string | null,
): { amount: string; type: string } {
  if (!dosage?.trim()) return { amount: "", type: "" };
  const parts = dosage.trim().split(/\s+/);
  if (parts.length === 1) return { amount: parts[0], type: "" };
  const [first, ...rest] = parts;
  const joined = rest.join(" ");
  if (DOSAGE_TYPES.includes(joined)) {
    return { amount: first, type: joined };
  }
  return { amount: dosage.trim(), type: "" };
}

export type MedicationEditDraft = {
  name: string;
  dosageAmount: string;
  dosageType: string;
  dosesPerPeriod: string;
  schedulePeriod: SchedulePeriod;
  customIntervalCount: string;
  customIntervalUnit: MedicationDosePeriod;
  condition: string;
  notes: string;
  reminderDate: Date;
  lastGivenOn: string;
};

export function hydrateFromMed(m: PetMedication): MedicationEditDraft {
  const { amount, type } = splitDosage(m.dosage);
  const period = m.dose_period ?? null;
  const ic = m.interval_count;
  const iu = m.interval_unit ?? null;
  const isCustomInterval =
    ic != null &&
    ic > 0 &&
    iu != null &&
    (iu === "day" || iu === "week" || iu === "month");

  if (isCustomInterval) {
    return {
      name: m.name,
      dosageAmount: amount,
      dosageType: type,
      dosesPerPeriod: "1",
      schedulePeriod: "custom",
      customIntervalCount: String(ic),
      customIntervalUnit: iu,
      condition: m.condition?.trim() ?? "",
      notes: m.notes?.trim() ?? "",
      reminderDate: parseReminderTimeHHmm(m.reminder_time ?? null),
      lastGivenOn: lastGivenOnFromDb(m.last_given_on),
    };
  }

  return {
    name: m.name,
    dosageAmount: amount,
    dosageType: type,
    dosesPerPeriod:
      m.doses_per_period != null ? String(m.doses_per_period) : "1",
    schedulePeriod: (period ?? "day") as SchedulePeriod,
    customIntervalCount: "1",
    customIntervalUnit: "month",
    condition: m.condition?.trim() ?? "",
    notes: m.notes?.trim() ?? "",
    reminderDate: parseReminderTimeHHmm(m.reminder_time ?? null),
    lastGivenOn: lastGivenOnFromDb(m.last_given_on),
  };
}
