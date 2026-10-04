/**
 * Per-dose drafts for the medication editor (amount + type + time),
 * mirroring meal portions.
 */

import {
  DEFAULT_DOSAGE_TYPE,
  MAX_MEDICATION_DOSAGES,
} from "@/constants/medicationEditForm";
import type { MedicationFormEntry, PetMedication } from "@/types/database";
import {
  decodeMedicationDosageSlots,
  encodeMedicationDosageDisplay,
  splitDosage,
} from "@/utils/medicationDosageSlots";
import { getMedicationReminderTimes } from "@/utils/medicationReminderTimes";
import {
  formatReminderTimeHHmm,
  parseReminderTimeHHmm,
} from "@/utils/medicationSchedule";

export type MedicationDosageDraft = {
  key: string;
  dosageAmount: string;
  dosageType: string;
  reminderTime: Date;
};

export {
  decodeMedicationDosageSlots,
  encodeMedicationDosageDisplay,
  splitDosage,
};

function defaultTimesForCount(count: number): string[] {
  const n = Math.min(MAX_MEDICATION_DOSAGES, Math.max(1, count));
  if (n === 1) return ["08:00"];
  if (n === 2) return ["08:00", "20:00"];
  if (n === 3) return ["08:00", "14:00", "20:00"];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const hour = Math.min(22, 7 + Math.round((i * 14) / Math.max(1, n - 1)));
    out.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return out;
}

function timesForHydration(m: PetMedication): string[] {
  const fromReminders = getMedicationReminderTimes(m);
  if (fromReminders.length > 0) return fromReminders;
  const n = m.doses_per_period;
  if (n != null && n > 0) return defaultTimesForCount(n);
  if (m.dosage?.trim()) return ["08:00"];
  return [];
}

export function hydrateDosagesFromMed(
  m: PetMedication,
): MedicationDosageDraft[] {
  const times = timesForHydration(m);
  const decoded = decodeMedicationDosageSlots(m.dosage, times.length);
  return times.map((t, i) => ({
    key: `${m.id}-${t}-${i}`,
    dosageAmount: decoded[i]?.amount ?? "",
    dosageType: decoded[i]?.type || DEFAULT_DOSAGE_TYPE,
    reminderTime: parseReminderTimeHHmm(t),
  }));
}

export function uniqueDosagesByTime(
  dosages: MedicationDosageDraft[],
): MedicationDosageDraft[] {
  const seen = new Set<string>();
  const out: MedicationDosageDraft[] = [];
  const sorted = [...dosages].sort((a, b) => {
    const aMin =
      a.reminderTime.getHours() * 60 + a.reminderTime.getMinutes();
    const bMin =
      b.reminderTime.getHours() * 60 + b.reminderTime.getMinutes();
    return aMin - bMin;
  });
  for (const d of sorted) {
    const hhmm = formatReminderTimeHHmm(d.reminderTime);
    if (seen.has(hhmm)) continue;
    seen.add(hhmm);
    out.push(d);
  }
  return out;
}

export function dosagePartsForReminderTime(
  med: PetMedication,
  hhmm: string,
): { amount: string; unit: string } {
  const times = getMedicationReminderTimes(med);
  const idx = times.indexOf(hhmm);
  if (idx >= 0) {
    const decoded = decodeMedicationDosageSlots(med.dosage, times.length);
    const slot = decoded[idx];
    if (slot) return { amount: slot.amount, unit: slot.type };
  }
  const shared = splitDosage(med.dosage);
  return { amount: shared.amount, unit: shared.type };
}

export function dosagesFromFormEntry(
  m: MedicationFormEntry,
): MedicationDosageDraft[] {
  if (m.dosages?.length) {
    return m.dosages.map((d) => ({
      key: d.key,
      dosageAmount: d.dosageAmount,
      dosageType: d.dosageType,
      reminderTime: parseReminderTimeHHmm(d.reminderTimeHHmm),
    }));
  }
  const times =
    m.reminderTimes.length > 0 ? m.reminderTimes : m.dosageAmount.trim() ? ["08:00"] : [];
  return times.map((t, i) => ({
    key: `legacy-${m.localId}-${i}`,
    dosageAmount: m.dosageAmount,
    dosageType: m.dosageType,
    reminderTime: parseReminderTimeHHmm(t),
  }));
}

export function dosagesToFormEntries(
  dosages: MedicationDosageDraft[],
): NonNullable<MedicationFormEntry["dosages"]> {
  return dosages.map((d) => ({
    key: d.key,
    dosageAmount: d.dosageAmount,
    dosageType: d.dosageType,
    reminderTimeHHmm: formatReminderTimeHHmm(d.reminderTime),
  }));
}

export function isMedicationDosagesValid(
  dosages: MedicationDosageDraft[],
): boolean {
  if (dosages.length < 1) return false;
  return dosages.every(
    (d) => d.dosageAmount.trim().length > 0 && d.dosageType.trim().length > 0,
  );
}
