import type { PetFood, PetFoodPortion } from "@/types/database";

import { formatFeedTimeLabel } from "@/utils/petFoodTime";
import type { UserTimeDisplay } from "@/utils/userDateTimeFormat";

/**
 * Meal vs treat is stored explicitly on `pet_foods.is_treat` (set during onboarding).
 */
export function isTreatFood(f: { is_treat: boolean }): boolean {
  return f.is_treat;
}

/**
 * Portions from API (nested `pet_food_portions`), ordered for display.
 */
export function portionsForPetFood(f: PetFood): PetFoodPortion[] {
  const raw = f.pet_food_portions;
  if (!raw?.length) return [];
  return [...raw].sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Raw `meals_per_day` from DB — legacy foods without portion rows.
 */
export function feedingTimesPerDayTarget(f: {
  meals_per_day: number | null;
}): number {
  const n = f.meals_per_day;
  if (n == null || n < 1) return 1;
  return Math.round(n);
}

/**
 * Expected servings per day for daily progress rings.
 * Prefer `pet_food_portions` count when present; else `meals_per_day`.
 */
export function dailyProgressFoodTarget(f: PetFood): number {
  const portions = portionsForPetFood(f);
  if (portions.length > 0) {
    return portions.length;
  }
  return feedingTimesPerDayTarget(f);
}

/**
 * Subline for food cards — uses `pet_food_portions` when present (meals and treats).
 */
export function formatPetFoodPortionSubline(
  f: PetFood,
  timeDisplay: UserTimeDisplay,
): string {
  const portions = portionsForPetFood(f);
  if (portions.length > 0) {
    return portions
      .map((p) => {
        const amt =
          [p.portion_size?.trim(), p.portion_unit?.trim()]
            .filter(Boolean)
            .join(" ") || "—";
        const t = formatFeedTimeLabel(p.feed_time, timeDisplay);
        return `${amt} @ ${t}`;
      })
      .join(" · ");
  }

  const size = f.portion_size?.trim() ?? "";
  const unit = f.portion_unit?.trim() ?? "";
  const line = [size, unit].filter(Boolean).join(" ") || "—";
  const n = feedingTimesPerDayTarget(f);
  return n > 1 ? `${line} · ${n}×/day` : line;
}

const LEGACY_MEAL_HOURS = [8, 12, 18, 7, 13, 19, 9, 17];

export type MealPortionDraft = {
  key: string;
  portionSize: string;
  portionUnit: string;
  feedTime: Date;
};

/** Expand legacy single-portion foods into editable rows (before first save with portions table). */
export function deriveMealPortionsFromLegacy(
  f: PetFood,
  defaultUnit = "Cups",
): MealPortionDraft[] {
  const n = Math.min(8, Math.max(1, feedingTimesPerDayTarget(f)));
  const size = f.portion_size?.trim() ?? "";
  const unit = f.portion_unit?.trim() || defaultUnit;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    const h = LEGACY_MEAL_HOURS[i] ?? 8 + i * 2;
    d.setHours(h, 0, 0, 0);
    return {
      key: `legacy-${f.id ?? "row"}-${i}`,
      portionSize: size,
      portionUnit: unit,
      feedTime: d,
    };
  });
}

/**
 * Onboarding / form hydration when a food has no `mealPortions` but legacy
 * portion + times-per-day fields (older single-row flow).
 */
export function deriveMealPortionsFromLegacyFields(fields: {
  mealsPerDayStr: string;
  portionSize: string;
  portionUnit: string;
  defaultUnit?: string;
}): MealPortionDraft[] {
  const n = Math.min(
    8,
    Math.max(1, parseInt(fields.mealsPerDayStr.trim(), 10) || 1),
  );
  const size = fields.portionSize?.trim() ?? "";
  const unit =
    fields.portionUnit?.trim() || fields.defaultUnit || "Cups";
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    const h = LEGACY_MEAL_HOURS[i] ?? 8 + i * 2;
    d.setHours(h, 0, 0, 0);
    return {
      key: `legacy-onboarding-${i}`,
      portionSize: size,
      portionUnit: unit,
      feedTime: d,
    };
  });
}
