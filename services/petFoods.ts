import { supabase } from "@/lib/supabase";
import type { PetFood } from "@/types/database";

export type UpsertPetFoodInput = {
  brand: string;
  portion_size: string | null;
  portion_unit: string | null;
  meals_per_day: number | null;
  is_treat: boolean;
  notes: string | null;
};

export async function insertPetFood(
  petId: string,
  input: UpsertPetFoodInput,
): Promise<PetFood> {
  const { data, error } = await supabase
    .from("pet_foods")
    .insert({
      pet_id: petId,
      brand: input.brand.trim(),
      portion_size: input.portion_size?.trim() || null,
      portion_unit: input.portion_unit?.trim() || null,
      meals_per_day: input.meals_per_day,
      is_treat: input.is_treat,
      notes: input.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PetFood;
}

export async function updatePetFood(
  petId: string,
  foodId: string,
  input: UpsertPetFoodInput,
): Promise<PetFood> {
  const { data, error } = await supabase
    .from("pet_foods")
    .update({
      brand: input.brand.trim(),
      portion_size: input.portion_size?.trim() || null,
      portion_unit: input.portion_unit?.trim() || null,
      meals_per_day: input.meals_per_day,
      is_treat: input.is_treat,
      notes: input.notes?.trim() || null,
    })
    .eq("id", foodId)
    .eq("pet_id", petId)
    .select()
    .single();

  if (error) throw error;
  return data as PetFood;
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
