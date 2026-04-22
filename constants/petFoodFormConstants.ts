/**
 * Shared option lists for pet-food editor forms (onboarding step,
 * dedicated edit screen, and food activity log step).
 */

export const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"] as const;
export type PortionUnit = (typeof PORTION_UNITS)[number];

/**
 * Typed as `readonly string[]` (not the literal tuple) so call sites can pass
 * arbitrary strings to `Array.includes` without type narrowing complaints.
 */
export const TIMES_QUICK: readonly string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
];
