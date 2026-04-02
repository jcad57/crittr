import { supabase } from "@/lib/supabase";
import type {
  CoCarePermissions,
  Pet,
  PetFormData,
  PetWithDetails,
  PetWithRole,
} from "@/types/database";
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
  const policyNum =
    petData.isInsured === true && petData.insurancePolicyNumber.trim()
      ? petData.insurancePolicyNumber.trim()
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
      insurance_policy_number: policyNum,
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

/**
 * Returns all pets the user has access to — owned and co-cared — tagged with
 * the user's role. Owned pets appear first, then shared pets.
 */
export async function fetchAccessiblePets(
  userId: string,
): Promise<PetWithRole[]> {
  const [ownedRes, coLinksRes] = await Promise.all([
    supabase
      .from("pets")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("pet_co_carers")
      .select("pet_id, permissions")
      .eq("user_id", userId),
  ]);

  if (ownedRes.error) throw ownedRes.error;
  if (coLinksRes.error) throw coLinksRes.error;

  const owned: PetWithRole[] = (ownedRes.data ?? []).map((p) => ({
    ...p,
    role: "owner" as const,
  }));

  const links = coLinksRes.data ?? [];
  if (links.length === 0) {
    return owned;
  }

  const petIds = [...new Set(links.map((l) => l.pet_id))];
  const permByPetId = new Map(
    links.map((l) => [l.pet_id, l.permissions as CoCarePermissions]),
  );

  const { data: sharedPets, error: sharedPetsErr } = await supabase
    .from("pets")
    .select("*")
    .in("id", petIds)
    .order("created_at", { ascending: true });

  if (sharedPetsErr) throw sharedPetsErr;

  const shared: PetWithRole[] = (sharedPets ?? []).map((p) => ({
    ...p,
    role: "co_carer" as const,
    permissions: permByPetId.get(p.id),
  }));

  return [...owned, ...shared];
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
  /** Required for dog/other; ignored or null for other species when not tracked. */
  exercises_per_day: number | null;
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
): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .update({
      energy_level: fields.energy_level,
      exercises_per_day: fields.exercises_per_day,
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

/** After delete or memorialization, ensure one living pet is `is_active` if any exist. */
export async function ensureOneActivePet(ownerId: string): Promise<void> {
  const { data: rows, error } = await supabase
    .from("pets")
    .select("id, is_memorialized, is_active")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const pets = rows ?? [];
  const living = pets.filter((p) => !p.is_memorialized);
  if (living.length === 0) {
    await supabase.from("pets").update({ is_active: false }).eq("owner_id", ownerId);
    return;
  }
  const hasLivingActive = living.some((p) => p.is_active);
  if (hasLivingActive) return;

  await supabase.from("pets").update({ is_active: false }).eq("owner_id", ownerId);
  await supabase
    .from("pets")
    .update({ is_active: true })
    .eq("id", living[0].id)
    .eq("owner_id", ownerId);
}

export async function memorializePet(ownerId: string, petId: string): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .update({
      is_memorialized: true,
      memorialized_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  await ensureOneActivePet(ownerId);
  return data as Pet;
}

/** Clear memorial status so the pet appears again on the dashboard and in activity flows. */
export async function unmemorializePet(
  ownerId: string,
  petId: string,
): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .update({
      is_memorialized: false,
      memorialized_at: null,
    })
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  await ensureOneActivePet(ownerId);
  return data as Pet;
}

export async function deletePet(ownerId: string, petId: string): Promise<void> {
  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("owner_id", ownerId);

  if (error) throw error;
  await ensureOneActivePet(ownerId);
}
