/**
 * Meal vs treat is stored explicitly on `pet_foods.is_treat` (set during onboarding).
 */
export function isTreatFood(f: { is_treat: boolean }): boolean {
  return f.is_treat;
}

/**
 * Daily progress ring: how many times per day this food/treat should be given
 * (`pet_foods.meals_per_day`). Used for both Meals and Treats totals.
 */
export function feedingTimesPerDayTarget(f: {
  meals_per_day: number | null;
}): number {
  const n = f.meals_per_day;
  if (n == null || n < 1) return 1;
  return Math.round(n);
}
