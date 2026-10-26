import type { UpsertPetFoodInput } from "@/services/petFoods";
import type { MealPortionDraft } from "@/utils/petFood";
import { dateToPgTime } from "@/utils/petFoodTime";

export type PetFoodPayloadInput = {
  brand: string;
  isTreat: boolean;
  notes: string;
  mealPortions: MealPortionDraft[];
};

export function buildPetFoodPayload({
  brand,
  isTreat,
  notes,
  mealPortions,
}: PetFoodPayloadInput): UpsertPetFoodInput {
  return {
    brand: brand.trim(),
    portion_size: null,
    portion_unit: null,
    meals_per_day: mealPortions.length,
    is_treat: isTreat,
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
  mealPortions,
}: {
  brand: string;
  isTreat?: boolean;
  mealsPerDay?: string;
  mealPortions: MealPortionDraft[];
}): boolean {
  if (!brand.trim()) return false;
  if (mealPortions.length < 1) return false;
  return mealPortions.every((p) => p.portionSize.trim().length > 0);
}
