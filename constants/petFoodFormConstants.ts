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

/** Brand field hint: dog-oriented default; cats get a familiar feline brand. */
export const FOOD_BRAND_PLACEHOLDER_DEFAULT = "e.g. Purina Pro Plan";
export const FOOD_BRAND_PLACEHOLDER_CAT = "e.g. Fancy Feast";

export function foodBrandInputPlaceholder(
  petType: string | null | undefined,
): string {
  return petType === "cat"
    ? FOOD_BRAND_PLACEHOLDER_CAT
    : FOOD_BRAND_PLACEHOLDER_DEFAULT;
}
