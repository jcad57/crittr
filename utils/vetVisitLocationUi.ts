/** Dropdown option for a clinic not listed on the pet profile. */
export const VET_VISIT_LOCATION_OTHER = "Other";

export function resolveVetVisitLocation(
  choice: string,
  otherText: string,
  primaryClinic: string | null | undefined,
): string | null {
  const p = primaryClinic?.trim();
  const o = otherText.trim();
  if (p) {
    if (choice === p) return p;
    if (choice === VET_VISIT_LOCATION_OTHER) return o || null;
    return choice.trim() || null;
  }
  return o || null;
}

/** Restore dropdown + "Other" field state from stored `location` + profile clinic. */
export function hydrateVetVisitLocationState(
  savedLocation: string | null | undefined,
  primaryClinic: string | null | undefined,
): { choice: string; otherText: string } {
  const saved = savedLocation?.trim() ?? "";
  const p = primaryClinic?.trim();
  if (!p) {
    return { choice: "", otherText: saved };
  }
  if (!saved) {
    return { choice: p, otherText: "" };
  }
  if (saved === p) {
    return { choice: p, otherText: "" };
  }
  return { choice: VET_VISIT_LOCATION_OTHER, otherText: saved };
}
