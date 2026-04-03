import { supabase } from "@/lib/supabase";
import type { FoodFormEntry, PetFood } from "@/types/database";

export type PetFoodPortionInput = {
  portion_size: string | null;
  portion_unit: string | null;
  /** Postgres `time` as `HH:MM:SS`. */
  feed_time: string;
};

export type UpsertPetFoodInput = {
  brand: string;
  portion_size: string | null;
  portion_unit: string | null;
  meals_per_day: number | null;
  is_treat: boolean;
  notes: string | null;
  /** Meal-only: replaces all `pet_food_portions` rows. Ignored for treats. */
  portions?: PetFoodPortionInput[] | null;
};

/** Maps onboarding `FoodFormEntry` to API input (treats vs scheduled meal portions). */
export function foodFormEntryToUpsertInput(f: FoodFormEntry): UpsertPetFoodInput {
  if (f.isTreat) {
    const times = parseInt(f.mealsPerDay.trim(), 10);
    const mealsPerDayVal =
      Number.isFinite(times) && times >= 1 ? Math.min(8, times) : 1;
    return {
      brand: f.brand.trim(),
      portion_size: f.portionSize?.trim() || null,
      portion_unit: f.portionUnit?.trim() || null,
      meals_per_day: mealsPerDayVal,
      is_treat: true,
      notes: f.notes.trim() || null,
      portions: null,
    };
  }
  const portions: PetFoodPortionInput[] = (f.mealPortions ?? []).map((p) => ({
    portion_size: p.portionSize.trim() || null,
    portion_unit: p.portionUnit.trim() || null,
    feed_time: p.feedTimePg.trim(),
  }));
  return {
    brand: f.brand.trim(),
    portion_size: null,
    portion_unit: null,
    meals_per_day: portions.length > 0 ? portions.length : null,
    is_treat: false,
    notes: f.notes.trim() || null,
    portions: portions.length > 0 ? portions : null,
  };
}

async function fetchPetFoodById(foodId: string): Promise<PetFood> {
  const { data, error } = await supabase
    .from("pet_foods")
    .select("*, pet_food_portions(*)")
    .eq("id", foodId)
    .single();

  if (error) throw error;
  return data as PetFood;
}

export async function insertPetFood(
  petId: string,
  input: UpsertPetFoodInput,
): Promise<PetFood> {
  const isTreat = input.is_treat;
  const portions = !isTreat ? input.portions?.filter(Boolean) ?? [] : [];

  const { data: food, error } = await supabase
    .from("pet_foods")
    .insert({
      pet_id: petId,
      brand: input.brand.trim(),
      portion_size: isTreat ? input.portion_size?.trim() || null : null,
      portion_unit: isTreat ? input.portion_unit?.trim() || null : null,
      meals_per_day: isTreat
        ? input.meals_per_day
        : portions.length > 0
          ? portions.length
          : input.meals_per_day,
      is_treat: isTreat,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  if (!isTreat && portions.length > 0) {
    const rows = portions.map((p, i) => ({
      pet_food_id: food.id,
      portion_size: p.portion_size?.trim() || null,
      portion_unit: p.portion_unit?.trim() || null,
      feed_time: p.feed_time,
      sort_order: i,
    }));

    const { error: pe } = await supabase.from("pet_food_portions").insert(rows);
    if (pe) throw pe;
  }

  return fetchPetFoodById(food.id);
}

export async function updatePetFood(
  petId: string,
  foodId: string,
  input: UpsertPetFoodInput,
): Promise<PetFood> {
  const isTreat = input.is_treat;
  const portions = !isTreat ? input.portions?.filter(Boolean) ?? [] : [];

  const { error } = await supabase
    .from("pet_foods")
    .update({
      brand: input.brand.trim(),
      portion_size: isTreat ? input.portion_size?.trim() || null : null,
      portion_unit: isTreat ? input.portion_unit?.trim() || null : null,
      meals_per_day: isTreat
        ? input.meals_per_day
        : portions.length > 0
          ? portions.length
          : input.meals_per_day,
      is_treat: isTreat,
      notes: input.notes?.trim() || null,
    })
    .eq("id", foodId)
    .eq("pet_id", petId);

  if (error) throw error;

  const { error: delErr } = await supabase
    .from("pet_food_portions")
    .delete()
    .eq("pet_food_id", foodId);

  if (delErr) throw delErr;

  if (!isTreat && portions.length > 0) {
    const rows = portions.map((p, i) => ({
      pet_food_id: foodId,
      portion_size: p.portion_size?.trim() || null,
      portion_unit: p.portion_unit?.trim() || null,
      feed_time: p.feed_time,
      sort_order: i,
    }));

    const { error: insErr } = await supabase
      .from("pet_food_portions")
      .insert(rows);
    if (insErr) throw insErr;
  }

  return fetchPetFoodById(foodId);
}

export async function deletePetFood(
  petId: string,
  foodId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pet_foods")
    .delete()
    .eq("id", foodId)
    .eq("pet_id", petId);

  if (error) throw error;
}
