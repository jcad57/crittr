/** Trim trailing zeros for display (e.g. 1.5 stays, 2.0 → "2"). */
function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

/**
 * Human-readable dosage for activity list rows, e.g. "2 tablets", "1 injection".
 * Matches `MedicationDetailStep` unit options (Tablet, Injection, …).
 */
export function formatMedicationDosageDisplay(
  medAmount: number | null,
  medUnit: string | null,
): string {
  if (medAmount == null || medUnit == null || !String(medUnit).trim()) {
    return "";
  }
  const unitLower = String(medUnit).trim().toLowerCase();
  const n = medAmount;
  const isOne = n === 1;

  const p = (singular: string, plural: string) => (isOne ? singular : plural);

  switch (unitLower) {
    case "tablet":
      return `${formatAmount(n)} ${p("tablet", "tablets")}`;
    case "injection":
      return `${formatAmount(n)} ${p("injection", "injections")}`;
    case "chewable":
      return `${formatAmount(n)} ${p("chewable", "chewables")}`;
    case "liquid":
      return `${formatAmount(n)} ${p("liquid dose", "liquid doses")}`;
    case "topical":
      return `${formatAmount(n)} ${p("application", "applications")}`;
    case "other":
      return `${formatAmount(n)} ${p("dose", "doses")}`;
    default:
      return `${formatAmount(n)} ${unitLower}`;
  }
}
