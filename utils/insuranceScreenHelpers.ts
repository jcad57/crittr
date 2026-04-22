export function insuranceStatusLabel(isInsured: boolean | null): {
  line1: string;
  line2?: string;
} {
  if (isInsured === true) return { line1: "Yes" };
  return { line1: "No" };
}
