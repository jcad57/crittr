import type { PetFood, PetFoodPortion } from "@/types/database";

import { formatFeedTimeLabel } from "@/lib/petFoodTime";

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
 * Raw `meals_per_day` from DB — treats and legacy meals without portion rows.
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
 * - **Meals:** count of `pet_food_portions` when present (each portion = one ring slot); else `meals_per_day`.
 * - **Treats:** `meals_per_day` (times per day).
 */
export function dailyProgressFoodTarget(f: PetFood): number {
  if (isTreatFood(f)) {
    return feedingTimesPerDayTarget(f);
  }
  const portions = portionsForPetFood(f);
  if (portions.length > 0) {
    return portions.length;
  }
  return feedingTimesPerDayTarget(f);
}

/**
 * Subline for food cards — treats use legacy fields; meals use `pet_food_portions` when present.
 */
export function formatPetFoodPortionSubline(f: PetFood): string {
  if (isTreatFood(f)) {
    const size = f.portion_size?.trim() ?? "";
    const unit = f.portion_unit?.trim() ?? "";
    const line = [size, unit].filter(Boolean).join(" ") || "—";
    const n = feedingTimesPerDayTarget(f);
    return n > 1 ? `${line} · ${n}×/day` : line;
  }

  const portions = portionsForPetFood(f);
  if (portions.length > 0) {
    return portions
      .map((p) => {
        const amt =
          [p.portion_size?.trim(), p.portion_unit?.trim()]
            .filter(Boolean)
            .join(" ") || "—";
        const t = formatFeedTimeLabel(p.feed_time);
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

/** Expand legacy single-portion meals into editable rows (before first save with portions table). */
export function deriveMealPortionsFromLegacy(f: PetFood): MealPortionDraft[] {
  const n = Math.min(8, Math.max(1, feedingTimesPerDayTarget(f)));
  const size = f.portion_size?.trim() ?? "";
  const unit = f.portion_unit?.trim() || "Cups";
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
 * Onboarding / form hydration when a meal has no `mealPortions` but legacy
 * portion + times-per-day fields (older single-row flow).
 */
export function deriveMealPortionsFromLegacyFields(fields: {
  mealsPerDayStr: string;
  portionSize: string;
  portionUnit: string;
}): MealPortionDraft[] {
  const n = Math.min(
    8,
    Math.max(1, parseInt(fields.mealsPerDayStr.trim(), 10) || 1),
  );
  const size = fields.portionSize?.trim() ?? "";
  const unit = fields.portionUnit?.trim() || "Cups";
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
