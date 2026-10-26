/** Field-level edits to an existing pet, one function per editable screen. */

import { supabase } from "@/lib/supabase";
import {
  extensionForContentType,
  inferImageContentType,
  readLocalImageUriAsArrayBuffer,
} from "@/services/localImageUpload";
import type { PetExercisePlanInput } from "@/services/petExercisePlans";
import { replacePetExercisePlans } from "@/services/petExercisePlans";
import type { Pet, PetWithDetails } from "@/types/database";
import { yearsMonthsFromBirthDate } from "@/utils/petAge";
import { parseDateOnlyYmd } from "@/utils/petDisplay";

export type PetMicrochipUpdate = {
  is_microchipped: boolean | null;
  microchip_number: string | null;
};

export type UpdatePetNameAndBreedInput = {
  name: string;
  breed: string | null;
};

export async function updatePetNameAndBreed(
  petId: string,
  fields: UpdatePetNameAndBreedInput,
): Promise<Pet> {
  const trimmed = fields.name.trim();
  if (!trimmed) {
    throw new Error("Name is required");
  }

  const { data, error } = await supabase
    .from("pets")
    .update({
      name: trimmed,
      breed: fields.breed,
    })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return data as Pet;
}

export async function updatePetMicrochip(
  petId: string,
  fields: PetMicrochipUpdate,
): Promise<void> {
  const { error } = await supabase
    .from("pets")
    .update({
      is_microchipped: fields.is_microchipped,
      microchip_number: fields.microchip_number,
    })
    .eq("id", petId);

  if (error) throw error;
}

export type UpdatePetInsuranceInput = {
  is_insured: boolean | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
};

export async function updatePetInsurance(
  petId: string,
  fields: UpdatePetInsuranceInput,
): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .update({
      is_insured: fields.is_insured,
      insurance_provider: fields.insurance_provider,
      insurance_policy_number: fields.insurance_policy_number,
    })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return data as Pet;
}

export type UpdatePetDetailsInput = {
  breed: string | null;
  color: string | null;
  primary_vet_clinic: string | null;
  primary_vet_address: string | null;
  weight_lbs: number | null;
  weight_unit: "lbs" | "kg" | null;
  date_of_birth: string | null;
  sex: "male" | "female" | null;
};

export type UpdatePetExerciseRequirementsInput = {
  energy_level: "low" | "medium" | "high";
  /** Full replace of planned activities; empty clears plans. */
  exercise_plans: PetExercisePlanInput[];
};

export async function updatePetDetails(
  petId: string,
  fields: UpdatePetDetailsInput,
): Promise<Pet> {
  const dob = parseDateOnlyYmd(fields.date_of_birth ?? "") ?? null;
  let age: number | null = null;
  let age_months: number | null = null;
  if (dob) {
    const { years, months } = yearsMonthsFromBirthDate(dob);
    age = years;
    age_months = months;
  }

  const { data, error } = await supabase
    .from("pets")
    .update({
      breed: fields.breed,
      color: fields.color,
      primary_vet_clinic: fields.primary_vet_clinic,
      primary_vet_address: fields.primary_vet_address,
      weight_lbs: fields.weight_lbs,
      weight_unit: fields.weight_unit,
      date_of_birth: dob,
      sex: fields.sex,
      age,
      age_months,
    })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return data as Pet;
}

export async function updatePetExerciseRequirements(
  petId: string,
  fields: UpdatePetExerciseRequirementsInput,
): Promise<{ pet: Pet; exercise_plans: PetWithDetails["exercise_plans"] }> {
  const plans = await replacePetExercisePlans(petId, fields.exercise_plans);

  const { data, error } = await supabase
    .from("pets")
    .update({
      energy_level: fields.energy_level,
      exercises_per_day: plans.length > 0 ? plans.length : null,
    })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return { pet: data as Pet, exercise_plans: plans };
}

export async function updatePetAvatar(
  ownerId: string,
  petId: string,
  localUri: string,
): Promise<Pet> {
  const contentType = inferImageContentType(localUri);
  const fileName = `pets/${ownerId}/${petId}-${Date.now()}.${extensionForContentType(contentType)}`;
  const buffer = await readLocalImageUriAsArrayBuffer(localUri);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, buffer, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName);

  const { data, error } = await supabase
    .from("pets")
    .update({ avatar_url: publicUrl })
    .eq("id", petId)
    .select()
    .single();

  if (error) throw error;
  return data as Pet;
}
