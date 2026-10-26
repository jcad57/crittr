/**
 * Encode / decode per-dose amount+type for `pet_medications.dosage`.
 * Kept free of path aliases so unit tests can import it from Node.
 */

const KNOWN_DOSAGE_TYPES = [
  "Tablet",
  "Injection",
  "Liquid",
  "Topical",
  "Chewable",
  "Other",
] as const;

const SLOT_SEP = " · ";

export function splitDosage(
  dosage: string | null,
): { amount: string; type: string } {
  if (!dosage?.trim()) return { amount: "", type: "" };
  const parts = dosage.trim().split(/\s+/);
  if (parts.length === 1) return { amount: parts[0]!, type: "" };
  const [first, ...rest] = parts;
  const joined = rest.join(" ");
  if ((KNOWN_DOSAGE_TYPES as readonly string[]).includes(joined)) {
    return { amount: first!, type: joined };
  }
  return { amount: dosage.trim(), type: "" };
}

function labelForSlot(amount: string, type: string): string {
  return [amount.trim(), type.trim()].filter(Boolean).join(" ");
}

/** Persist `pet_medications.dosage` from the dose list. */
export function encodeMedicationDosageDisplay(
  slots: { dosageAmount: string; dosageType: string }[],
): string | null {
  if (slots.length === 0) return null;
  const labels = slots.map((s) => labelForSlot(s.dosageAmount, s.dosageType));
  const unique = new Set(labels.filter(Boolean));
  if (unique.size <= 1) return labels.find(Boolean) || null;
  return labels.join(SLOT_SEP) || null;
}

export function decodeMedicationDosageSlots(
  dosage: string | null,
  slotCount: number,
): { amount: string; type: string }[] {
  const n = Math.max(0, slotCount);
  if (n === 0) return [];
  const raw = dosage?.trim() ?? "";
  if (!raw) {
    return Array.from({ length: n }, () => ({ amount: "", type: "" }));
  }
  const parts = raw.split(SLOT_SEP);
  if (parts.length === n) {
    return parts.map((p) => splitDosage(p));
  }
  const shared = splitDosage(raw);
  return Array.from({ length: n }, () => ({ ...shared }));
}
