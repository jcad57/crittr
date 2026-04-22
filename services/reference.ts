import { supabase } from "@/lib/supabase";
import type { Breed, CommonAllergy } from "@/types/database";

export async function fetchBreedsForPetType(petType: string): Promise<Breed[]> {
  const { data, error } = await supabase
    .from("breeds")
    .select("*")
    .eq("pet_type", petType)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Breed[];
}

export async function fetchAllergiesForPetType(
  petType: string,
): Promise<CommonAllergy[]> {
  const { data, error } = await supabase
    .from("common_allergies")
    .select("*")
    .eq("pet_type", petType)
    .order("name");
  if (error) throw error;
  return (data ?? []) as CommonAllergy[];
}
