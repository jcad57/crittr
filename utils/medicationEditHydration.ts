/**
 * Pure helpers that map a `PetMedication` row from the DB into the local
 * draft state used by the medication edit screen.
 */

import type { PetMedication } from "@/types/database";
import {
  hydrateDosagesFromMed,
  type MedicationDosageDraft,
} from "@/utils/medicationDosageDraft";
import {
  DEFAULT_FREQUENCY_DRAFT,
  frequencyDraftFromMed,
  type MedicationFrequencyDraft,
} from "@/utils/medicationFrequency";

export { splitDosage } from "@/utils/medicationDosageDraft";

export function lastGivenOnFromDb(raw: string | null | undefined): string {
  if (!raw?.trim()) return "";
  return raw.trim().split("T")[0].slice(0, 10);
}

export type MedicationEditDraft = {
  name: string;
  dosages: MedicationDosageDraft[];
  condition: string;
  notes: string;
  lastGivenOn: string;
  frequency: MedicationFrequencyDraft;
};

export function hydrateFromMed(m: PetMedication): MedicationEditDraft {
  return {
    name: m.name,
    dosages: hydrateDosagesFromMed(m),
    condition: m.condition?.trim() ?? "",
    notes: m.notes?.trim() ?? "",
    lastGivenOn: lastGivenOnFromDb(m.last_given_on),
    frequency: frequencyDraftFromMed(m) ?? DEFAULT_FREQUENCY_DRAFT,
  };
}
