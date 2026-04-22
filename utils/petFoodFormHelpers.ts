import type { UpsertPetFoodInput } from "@/services/petFoods";
import type { MealPortionDraft } from "@/utils/petFood";
import { dateToPgTime } from "@/utils/petFoodTime";

export type PetFoodPayloadInput = {
  brand: string;
  isTreat: boolean;
  portionSize: string;
  portionUnit: string;
  mealsPerDay: string;
  notes: string;
  mealPortions: MealPortionDraft[];
};

export function buildPetFoodPayload({
  brand,
  isTreat,
  portionSize,
  portionUnit,
  mealsPerDay,
  notes,
  mealPortions,
}: PetFoodPayloadInput): UpsertPetFoodInput {
  if (isTreat) {
    const times = parseInt(mealsPerDay.trim(), 10);
    const mealsPerDayVal =
      Number.isFinite(times) && times >= 1 ? Math.min(8, times) : 1;
    return {
      brand: brand.trim(),
      portion_size: portionSize.trim() || null,
      portion_unit: portionUnit.trim() || null,
      meals_per_day: mealsPerDayVal,
      is_treat: true,
      notes: notes.trim() || null,
      portions: null,
    };
  }
  return {
    brand: brand.trim(),
    portion_size: null,
    portion_unit: null,
    meals_per_day: mealPortions.length,
    is_treat: false,
    notes: notes.trim() || null,
    portions: mealPortions.map((p) => ({
      portion_size: p.portionSize.trim() || null,
      portion_unit: p.portionUnit.trim() || null,
      feed_time: dateToPgTime(p.feedTime),
    })),
  };
}

export function isPetFoodFormValid({
  brand,
  isTreat,
  mealsPerDay,
  mealPortions,
}: {
  brand: string;
  isTreat: boolean;
  mealsPerDay: string;
  mealPortions: MealPortionDraft[];
}): boolean {
  if (!brand.trim()) return false;
  if (isTreat) {
    return (
      mealsPerDay.trim() !== "" &&
      Number.isFinite(parseInt(mealsPerDay.trim(), 10)) &&
      parseInt(mealsPerDay.trim(), 10) >= 1
    );
  }
  if (mealPortions.length < 1) return false;
  return mealPortions.every((p) => p.portionSize.trim().length > 0);
}
