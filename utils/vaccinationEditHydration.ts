/**
 * Pure mapping from a stored `PetVaccination` row to the editor draft.
 */

import type { PetVaccination } from "@/types/database";

export type VaccinationEditDraft = {
  name: string;
  expiresOn: string;
  notes: string;
  administeredOn: string;
  administeredBy: string;
  lotNumber: string;
};

export function hydrateFromVaccination(
  v: PetVaccination,
): VaccinationEditDraft {
  return {
    name: v.name?.trim() ?? "",
    expiresOn: v.expires_on?.trim() ?? "",
    notes: v.notes?.trim() ?? "",
    administeredOn: v.administered_on?.trim() ?? "",
    administeredBy: v.administered_by?.trim() ?? "",
    lotNumber: v.lot_number?.trim() ?? "",
  };
}
