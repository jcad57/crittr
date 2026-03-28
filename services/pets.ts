import { isTreatFood } from "@/lib/petFood";
import { supabase } from "@/lib/supabase";
import type { Pet, PetFormData, PetWithDetails } from "@/types/database";
import {
  extensionForContentType,
  inferImageContentType,
  readLocalImageUriAsArrayBuffer,
} from "./localImageUpload";

export async function createPet(
  ownerId: string,
  petData: PetFormData,
  isFirst: boolean,
) {
  let avatarUrl: string | null = null;
  if (petData.avatarUri) {
    const contentType = inferImageContentType(petData.avatarUri);
    const fileName = `pets/${ownerId}/${Date.now()}.${extensionForContentType(contentType)}`;
    const buffer = await readLocalImageUriAsArrayBuffer(petData.avatarUri);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, buffer, { contentType, upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(fileName);
    avatarUrl = publicUrl;
  }

  const parsedDob = petData.dateOfBirth.trim() || null;
  const chipNum = petData.microchipNumber.trim();
  const insured =
    petData.isInsured === true && petData.insuranceProvider.trim()
      ? petData.insuranceProvider.trim()
      : null;

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .insert({
      owner_id: ownerId,
      pet_type: petData.petType || null,
      name: petData.name,
      breed: petData.breed || null,
      age: petData.ageYears ? parseInt(petData.ageYears, 10) : null,
      age_months: petData.ageMonths ? parseInt(petData.ageMonths, 10) : null,
      date_of_birth: parsedDob,
      weight_lbs: petData.weight ? parseFloat(petData.weight) : null,
      weight_unit: petData.weightUnit,
      sex: petData.sex || null,
      color: petData.color || null,
      about: petData.about || null,
      energy_level: petData.energyLevel || null,
      exercises_per_day: petData.exercisesPerDay
        ? parseInt(petData.exercisesPerDay, 10)
        : null,
      allergies: petData.allergies,
      avatar_url: avatarUrl,
      is_microchipped: petData.isMicrochipped,
      microchip_number:
        petData.isMicrochipped === true && chipNum ? chipNum : null,
      is_sterilized: petData.isSterilized,
      primary_vet_clinic: petData.primaryVetClinic.trim() || null,
      primary_vet_address: petData.primaryVetAddress.trim() || null,
      is_insured: petData.isInsured,
      insurance_provider: insured,
      is_active: isFirst,
    })
    .select()
    .single();

  if (petError) throw petError;

  // Insert foods
  if (petData.foods.length > 0) {
    const foodRows = petData.foods.map((f) => ({
      pet_id: pet.id,
      brand: f.brand,
      portion_size: f.portionSize || null,
      portion_unit: f.portionUnit || null,
      meals_per_day: f.mealsPerDay ? parseInt(f.mealsPerDay, 10) : null,
      is_treat: isTreatFood({
        is_treat: f.isTreat,
        portion_unit: f.portionUnit || null,
      }),
    }));

    const { error: foodError } = await supabase
      .from("pet_foods")
      .insert(foodRows);
    if (foodError) throw foodError;
  }

  // Insert medications
  if (petData.medications.length > 0) {
    const medRows = petData.medications.map((m) => ({
      pet_id: pet.id,
      name: m.name,
      dosage: [m.dosageAmount, m.dosageType].filter(Boolean).join(" ") || null,
      frequency:
        (m.frequency === "Custom" && m.customFrequency
          ? m.customFrequency
          : m.frequency) || null,
      condition: m.condition || null,
    }));

    const { error: medError } = await supabase
      .from("pet_medications")
      .insert(medRows);
    if (medError) throw medError;
  }

  // Insert co-carer invite if provided
  if (petData.coCarerEmail) {
    await supabase.from("co_carer_invites").insert({
      pet_id: pet.id,
      invited_by: ownerId,
      email: petData.coCarerEmail,
    });
  }

  return pet;
}

export async function fetchUserPets(ownerId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPetProfile(
  petId: string,
): Promise<PetWithDetails | null> {
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .single();

  if (petError || !pet) return null;

  const [foodsRes, medsRes, exerciseRes] = await Promise.all([
    supabase.from("pet_foods").select("*").eq("pet_id", petId),
    supabase.from("pet_medications").select("*").eq("pet_id", petId),
    supabase
      .from("pet_exercises")
      .select("*")
      .eq("pet_id", petId)
      .maybeSingle(),
  ]);

  return {
    ...pet,
    foods: foodsRes.data ?? [],
    medications: medsRes.data ?? [],
    exercise: exerciseRes.data ?? null,
  };
}

export type PetMicrochipUpdate = {
  is_microchipped: boolean | null;
  microchip_number: string | null;
};

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
