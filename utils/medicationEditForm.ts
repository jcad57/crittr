import type { MedicationDosePeriod } from "@/types/database";
import {
  encodeMedicationDosageDisplay,
  isMedicationDosagesValid,
  uniqueDosagesByTime,
  type MedicationDosageDraft,
} from "@/utils/medicationDosageDraft";
import {
  computeNextDueDate,
  toLocalYmd,
} from "@/utils/medicationDueSchedule";
import {
  frequencyDraftToDbFields,
  frequencyLabelForDraft,
  type MedicationFrequencyDraft,
} from "@/utils/medicationFrequency";
import {
  reminderFieldsForDb,
  sortTimesAscUnique,
} from "@/utils/medicationReminderTimes";
import { formatReminderTimeHHmm } from "@/utils/medicationSchedule";

export type MedicationFormState = {
  name: string;
  dosages: MedicationDosageDraft[];
  condition: string;
  notes: string;
  lastGivenOn: string;
  frequency: MedicationFrequencyDraft;
  /** Existing row `created_at`; used when last given is empty so next due starts from the add date. */
  createdAt?: string;
};

export type MedicationSavePayload = {
  name: string;
  dosage: string | null;
  frequency: string | null;
  condition: string | null;
  notes: string | null;
  doses_per_period: number | null;
  dose_period: MedicationDosePeriod | null;
  interval_count: number | null;
  interval_unit: MedicationDosePeriod | null;
  reminder_time: string | null;
  reminder_times: string[] | null;
  last_given_on: string | null;
  next_due_date: string | null;
};

/**
 * Builds the save payload for a pet medication. Returns `null` when the
 * dosage list is empty or a dose is missing amount/type. Name trimming is
 * the caller's responsibility for error UI; this function assumes
 * `name.trim()` already passed a non-empty check.
 */
export function buildMedicationSavePayload(
  state: MedicationFormState,
): MedicationSavePayload | null {
  const { name, dosages, condition, notes, lastGivenOn, frequency, createdAt } =
    state;

  if (!isMedicationDosagesValid(dosages)) return null;

  const unique = uniqueDosagesByTime(dosages);
  const hhmmList = sortTimesAscUnique(
    unique.map((d) => formatReminderTimeHHmm(d.reminderTime)),
  );
  const { reminder_time, reminder_times } = reminderFieldsForDb(hhmmList);
  const doses = unique.length;
  const db = frequencyDraftToDbFields(frequency);
  const freqLabel = frequencyLabelForDraft(frequency);
  const lastGiven = lastGivenOn.trim() || null;
  const now = new Date();
  const nextDue = computeNextDueDate(
    {
      id: "",
      pet_id: "",
      name: name.trim(),
      dosage: encodeMedicationDosageDisplay(unique),
      frequency: freqLabel,
      condition: null,
      notes: null,
      doses_per_period: doses,
      dose_period: db.dose_period,
      interval_count: db.interval_count,
      interval_unit: db.interval_unit,
      reminder_time,
      reminder_times,
      last_given_on: lastGiven,
      created_at: createdAt?.trim() || now.toISOString(),
    },
    now,
  );

  return {
    name: name.trim(),
    dosage: encodeMedicationDosageDisplay(unique),
    frequency: freqLabel,
    condition: condition.trim() || null,
    notes: notes.trim() || null,
    doses_per_period: doses,
    dose_period: db.dose_period,
    interval_count: db.interval_count,
    interval_unit: db.interval_unit,
    reminder_time,
    reminder_times,
    last_given_on: lastGiven,
    next_due_date: nextDue ? toLocalYmd(nextDue) : null,
  };
}
