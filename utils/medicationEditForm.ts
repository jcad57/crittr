import type { SchedulePeriod } from "@/constants/medicationEditForm";
import type { MedicationDosePeriod } from "@/types/database";
import {
  buildMedicationFrequencyLabelForDb,
  formatReminderTimeHHmm,
} from "@/utils/medicationSchedule";

export type MedicationFormState = {
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
  reminder_time: string;
  last_given_on: string | null;
};

/**
 * Builds the save payload for a pet medication. Returns `null` when validation
 * of the numeric fields fails (matches the original inline guards in the
 * screen). Name trimming is the caller's responsibility for error UI; this
 * function assumes `name.trim()` already passed a non-empty check.
 */
export function buildMedicationSavePayload(
  state: MedicationFormState,
): MedicationSavePayload | null {
  const {
    name,
    dosageAmount,
    dosageType,
    dosesPerPeriod,
    schedulePeriod,
    customIntervalCount,
    customIntervalUnit,
    condition,
    notes,
    reminderDate,
    lastGivenOn,
  } = state;

  const dosageStr =
    [dosageAmount.trim(), dosageType.trim()].filter(Boolean).join(" ") || null;

  if (schedulePeriod === "custom") {
    const n = customIntervalCount.trim();
    const parsedInterval = parseInt(n, 10);
    if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
      return null;
    }

    const freq = buildMedicationFrequencyLabelForDb(null, null, null, {
      count: parsedInterval,
      unit: customIntervalUnit,
    });

    return {
      name: name.trim(),
      dosage: dosageStr,
      frequency: freq,
      condition: condition.trim() || null,
      notes: notes.trim() || null,
      doses_per_period: null,
      dose_period: null,
      interval_count: parsedInterval,
      interval_unit: customIntervalUnit,
      reminder_time: formatReminderTimeHHmm(reminderDate),
      last_given_on: lastGivenOn.trim() || null,
    };
  }

  const dosePeriod = schedulePeriod as MedicationDosePeriod;
  const n = dosesPerPeriod.trim();
  const parsed = parseInt(n, 10);
  if (dosePeriod === "day" && (!Number.isFinite(parsed) || parsed < 1)) {
    return null;
  }
  if (
    (dosePeriod === "week" || dosePeriod === "month") &&
    n !== "" &&
    (!Number.isFinite(parsed) || parsed < 1)
  ) {
    return null;
  }

  const doses =
    dosePeriod === "day"
      ? Math.min(8, Math.max(1, parsed))
      : dosePeriod === "week" || dosePeriod === "month"
        ? Math.max(1, Number.isFinite(parsed) ? parsed : 1)
        : null;

  const freq = buildMedicationFrequencyLabelForDb(dosePeriod, doses, null);

  return {
    name: name.trim(),
    dosage: dosageStr,
    frequency: freq,
    condition: condition.trim() || null,
    notes: notes.trim() || null,
    doses_per_period: doses,
    dose_period: dosePeriod,
    interval_count: null,
    interval_unit: null,
    reminder_time: formatReminderTimeHHmm(reminderDate),
    last_given_on: lastGivenOn.trim() || null,
  };
}
