import { supabase } from "@/lib/supabase";
import type { Pet, PetFormData, PetWithDetails } from "@/types/database";
import { parseDateOnlyYmd } from "@/utils/petDisplay";
import { yearsMonthsFromBirthDate } from "@/utils/petAge";
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
      age:
        petData.ageYears.trim() !== ""
          ? parseInt(petData.ageYears, 10)
          : null,
      age_months:
        petData.ageMonths.trim() !== ""
          ? parseInt(petData.ageMonths, 10)
          : null,
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
    const foodRows = petData.foods.map((f) => {
      const times = parseInt(f.mealsPerDay.trim(), 10);
      const mealsPerDay =
        Number.isFinite(times) && times >= 1 ? times : null;
      return {
        pet_id: pet.id,
        brand: f.brand,
        portion_size: f.portionSize || null,
        portion_unit: f.portionUnit || null,
        meals_per_day: mealsPerDay,
        is_treat: f.isTreat,
        notes: f.notes.trim() || null,
      };
    });

    const { error: foodError } = await supabase
      .from("pet_foods")
      .insert(foodRows);
    if (foodError) throw foodError;
  }

  // Insert vaccinations
  if (petData.vaccinations.length > 0) {
    const vacRows = petData.vaccinations.map((v) => ({
      pet_id: pet.id,
      name: v.name.trim(),
      expires_on: v.expiresOn.trim() || null,
      frequency_label: v.frequencyLabel.trim() || null,
      notes: v.notes.trim() || null,
    }));

    const { error: vacError } = await supabase
      .from("pet_vaccinations")
      .insert(vacRows);
    if (vacError) throw vacError;
  }

  // Insert medications
  if (petData.medications.length > 0) {
    const medRows = petData.medications.map((m) => {
      const freqText =
        (m.frequency === "Custom" && m.customFrequency
          ? m.customFrequency
          : m.frequency) || null;
      const doses = m.dosesPerPeriod.trim()
        ? parseInt(m.dosesPerPeriod.trim(), 10)
        : null;
      return {
        pet_id: pet.id,
        name: m.name,
        dosage: [m.dosageAmount, m.dosageType].filter(Boolean).join(" ") || null,
        frequency: freqText,
        condition: m.condition || null,
        notes: m.notes?.trim() || null,
        doses_per_period: Number.isFinite(doses ?? NaN) ? doses : null,
        dose_period: m.dosePeriod || null,
        reminder_time: m.reminderTime?.trim() || null,
      };
    });

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

  const [foodsRes, medsRes, vacsRes, exerciseRes] = await Promise.all([
    supabase.from("pet_foods").select("*").eq("pet_id", petId),
    supabase.from("pet_medications").select("*").eq("pet_id", petId),
    supabase.from("pet_vaccinations").select("*").eq("pet_id", petId),
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
    vaccinations: vacsRes.data ?? [],
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
