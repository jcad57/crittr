import { supabase } from "@/lib/supabase";
import type {
  CoCarePermissions,
  LitterCleaningPeriod,
  Pet,
  PetFormData,
  PetWithDetails,
  PetWithRole,
} from "@/types/database";
import { parseDateOnlyYmd } from "@/utils/petDisplay";
import { yearsMonthsFromBirthDate } from "@/utils/petAge";
import { sendCoCareInvite } from "./coCare";
import {
  extensionForContentType,
  inferImageContentType,
  readLocalImageUriAsArrayBuffer,
} from "./localImageUpload";
import { foodFormEntryToUpsertInput, insertPetFood } from "./petFoods";
import type { PetExercisePlanInput } from "./petExercisePlans";
import {
  exercisePlanFormEntryToInput,
  replacePetExercisePlans,
} from "./petExercisePlans";
import { buildMedicationSavePayload } from "@/utils/medicationEditForm";
import { parseReminderTimeHHmm } from "@/utils/medicationSchedule";

export type CreatePetOptions = {
  /**
   * Optional idempotency key the onboarding flow attaches per pet form so
   * retries on network failure / partial errors don't create duplicate pet
   * rows. The DB enforces `(owner_id, client_request_id)` uniqueness; on
   * conflict we fetch the existing row and skip the child-row inserts
   * (foods / meds / vaccinations) so a retry never doubles them up.
   *
   * Generated client-side once per pet (stored on `PetFormData`).
   */
  clientRequestId?: string | null;
};

export async function createPet(
  ownerId: string,
  petData: PetFormData,
  isFirst: boolean,
  options?: CreatePetOptions,
) {
  const clientRequestId = options?.clientRequestId ?? null;

  /**
   * Idempotent path: when the caller passes a stable `clientRequestId` and a
   * pet with that key already exists for this owner, return it without
   * touching avatar storage or any child rows. This is what makes the
   * onboarding finish-step safe to retry after a transient failure.
   */
  if (clientRequestId) {
    const { data: existing } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("client_request_id", clientRequestId)
      .maybeSingle();
    if (existing) return existing;
  }

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

  const insertPayload: Record<string, unknown> = {
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
    exercises_per_day:
      petData.exercisePlans.length > 0
        ? petData.exercisePlans.length
        : petData.exercisesPerDay
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
  };
  if (clientRequestId) insertPayload.client_request_id = clientRequestId;

  const { data: pet, error: petError } = await supabase
    .from("pets")
    .insert(insertPayload)
    .select()
    .single();

  if (petError) {
    /**
     * Race: another tab / retry already inserted the pet with the same
     * `client_request_id`. Fetch and reuse rather than failing loudly.
     */
    if (clientRequestId && (petError as { code?: string }).code === "23505") {
      const { data: raced } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (raced) return raced;
    }
    throw petError;
  }

  // Insert foods (treats + legacy fields, or meals with `pet_food_portions`)
  for (const f of petData.foods) {
    await insertPetFood(pet.id, foodFormEntryToUpsertInput(f));
  }

  if (petData.exercisePlans.length > 0) {
    await replacePetExercisePlans(
      pet.id,
      petData.exercisePlans.map(exercisePlanFormEntryToInput),
    );
  }

  // Insert vaccinations
  if (petData.vaccinations.length > 0) {
    const vacRows = petData.vaccinations.map((v) => ({
      pet_id: pet.id,
      name: v.name.trim(),
      expires_on: v.expiresOn.trim() || null,
      frequency_label: null,
      notes: v.notes.trim() || null,
    }));

    const { error: vacError } = await supabase
      .from("pet_vaccinations")
      .insert(vacRows);
    if (vacError) throw vacError;
  }

  // Insert medications (same payload shape as logged-in add/edit medication)
  if (petData.medications.length > 0) {
    const medRows = petData.medications.map((m) => {
      const payload = buildMedicationSavePayload({
        name: m.name,
        dosageAmount: m.dosageAmount,
        dosageType: m.dosageType,
        dosesPerPeriod: m.dosesPerPeriod,
        schedulePeriod: m.schedulePeriod,
        customIntervalCount: m.customIntervalCount,
        customIntervalUnit: m.customIntervalUnit,
        condition: m.condition,
        notes: m.notes,
        reminderDates: m.reminderTimes.map((t) => parseReminderTimeHHmm(t)),
        lastGivenOn: m.lastGivenOn,
      });
      if (!payload) {
        throw new Error("Invalid medication data while creating pet.");
      }
      return {
        pet_id: pet.id,
        name: payload.name,
        dosage: payload.dosage,
        frequency: payload.frequency,
        condition: payload.condition,
        notes: payload.notes,
        doses_per_period: payload.doses_per_period,
        dose_period: payload.dose_period,
        interval_count: payload.interval_count,
        interval_unit: payload.interval_unit,
        reminder_time: payload.reminder_time,
        reminder_times: payload.reminder_times,
        last_given_on: payload.last_given_on,
      };
    });

    const { error: medError } = await supabase
      .from("pet_medications")
      .insert(medRows);
    if (medError) throw medError;
  }

  // Insert co-carer invite if provided (same rules as pet profile invite flow).
  // Pet creation is considered successful before this step; an invite failure
  // surfaces a soft warning via the throw, but the pet itself is already in
  // place. Callers that want to recover from invite failure should catch the
  // throw separately.
  if (petData.coCarerEmail?.trim()) {
    try {
      await sendCoCareInvite(pet.id, ownerId, petData.coCarerEmail);
    } catch (e) {
      /**
       * The Pro-required trigger on `co_carer_invites` throws P0001 when the
       * caller isn't on Crittr Pro yet. During onboarding the user hasn't
       * subscribed, so this is expected and must not destroy the pet. We
       * surface a structured warning instead.
       */
      const err = e as Error & { code?: string };
      throw new PetCreatedCoCareInviteFailedError(
        pet,
        err?.message ?? "Could not send the co-carer invite.",
      );
    }
  }

  return pet;
}

/**
 * Pet was created successfully but the co-carer invite step failed (typically
 * because the user isn't Pro at the moment of onboarding). Callers can use
 * `pet` to continue the flow and surface a non-blocking warning if needed.
 */
export class PetCreatedCoCareInviteFailedError extends Error {
  readonly pet: Pet;
  constructor(pet: Pet, message: string) {
    super(message);
    this.name = "PetCreatedCoCareInviteFailedError";
    this.pet = pet;
  }
}

/**
 * Server-side helper that guarantees exactly one living, non-archived pet
 * is `is_active = true` for the owner. Used after add-pet / delete-pet flows
 * and to recover from the "dashboard shows zero active pet" state.
 */
export async function repairActivePetSelection(ownerId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("repair_pet_active_flag", {
    target_owner: ownerId,
  });
  if (error) {
    if (__DEV__) console.warn("[repair_pet_active_flag]", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

export async function fetchUserPets(ownerId: string): Promise<Pet[]> {
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("is_archived", false)
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
  /**
   * Co-cared pets are embedded through the membership row so shared pets no
   * longer need a second round trip after the links come back.
   */
  const [ownedRes, coCaredRes] = await Promise.all([
    supabase
      .from("pets")
      .select("*")
      .eq("owner_id", userId)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("pet_co_carers")
      .select("permissions, pet:pets!inner(*)")
      .eq("user_id", userId)
      /** PostgREST filters embedded resources by their alias, not the table name. */
      .eq("pet.is_archived", false),
  ]);

  if (ownedRes.error) throw ownedRes.error;
  if (coCaredRes.error) throw coCaredRes.error;

  const owned: PetWithRole[] = (ownedRes.data ?? []).map((p) => ({
    ...p,
    role: "owner" as const,
  }));

  const coCaredRows = (coCaredRes.data ?? []) as unknown as {
    permissions: CoCarePermissions;
    pet: Pet | null;
  }[];

  const shared: PetWithRole[] = coCaredRows
    .filter((row): row is { permissions: CoCarePermissions; pet: Pet } =>
      row.pet != null,
    )
    .map((row) => ({
      ...row.pet,
      role: "co_carer" as const,
      permissions: row.permissions,
    }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return [...owned, ...shared];
}

/**
 * Every child table a pet profile needs, embedded so the whole thing is one
 * PostgREST round trip instead of a fan-out per table.
 */
const PET_WITH_DETAILS_SELECT =
  "*, pet_foods(*, pet_food_portions(*)), pet_medications(*), pet_vaccinations(*), pet_exercises(*), pet_exercise_plans(*)";

type HouseholdLitterGoals = {
  period: LitterCleaningPeriod | null;
  perPeriod: number | null;
};

const NO_LITTER_GOALS: HouseholdLitterGoals = { period: null, perPeriod: null };

function parseLitterGoals(value: unknown): HouseholdLitterGoals {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NO_LITTER_GOALS;
  }
  const o = value as Record<string, unknown>;
  const p = o.litter_cleaning_period;
  const n = o.litter_cleanings_per_period;
  return {
    period: p === "day" || p === "week" || p === "month" ? p : null,
    perPeriod: typeof n === "number" && Number.isFinite(n) ? n : null,
  };
}

/**
 * Litter goals live on the pet owner's profile, so they are identical for every
 * cat in a household — resolve one per distinct owner rather than per pet, and
 * skip the call entirely for households without cats.
 */
async function fetchLitterGoalsByOwner(
  rows: { id: string; owner_id: string; pet_type: string | null }[],
): Promise<Map<string, HouseholdLitterGoals>> {
  const probePetByOwner = new Map<string, string>();
  for (const row of rows) {
    if (row.pet_type !== "cat") continue;
    if (!probePetByOwner.has(row.owner_id)) {
      probePetByOwner.set(row.owner_id, row.id);
    }
  }

  const byOwner = new Map<string, HouseholdLitterGoals>();
  if (probePetByOwner.size === 0) return byOwner;

  const entries = [...probePetByOwner.entries()];
  const results = await Promise.all(
    entries.map(([, petId]) =>
      supabase.rpc("household_litter_goals_for_pet", { target_pet: petId }),
    ),
  );

  entries.forEach(([ownerId], i) => {
    byOwner.set(ownerId, parseLitterGoals(results[i]?.data));
  });

  return byOwner;
}

type PetDetailRow = Pet & {
  pet_foods?: PetWithDetails["foods"] | null;
  pet_medications?: PetWithDetails["medications"] | null;
  pet_vaccinations?: PetWithDetails["vaccinations"] | null;
  pet_exercises?: PetWithDetails["exercise"][] | null;
  pet_exercise_plans?: PetWithDetails["exercise_plans"] | null;
};

function toPetWithDetails(
  row: PetDetailRow,
  litterByOwner: Map<string, HouseholdLitterGoals>,
): PetWithDetails {
  const {
    pet_foods,
    pet_medications,
    pet_vaccinations,
    pet_exercises,
    pet_exercise_plans,
    ...pet
  } = row;

  const litter = litterByOwner.get(pet.owner_id) ?? NO_LITTER_GOALS;

  const plans = [...(pet_exercise_plans ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return {
    ...pet,
    foods: pet_foods ?? [],
    medications: pet_medications ?? [],
    vaccinations: pet_vaccinations ?? [],
    exercise: pet_exercises?.[0] ?? null,
    exercise_plans: plans,
    household_litter_cleaning_period: litter.period,
    household_litter_cleanings_per_period: litter.perPeriod,
  };
}

/**
 * Full details for many pets at once. Used to warm every pet's detail cache
 * from a single request on login instead of one fan-out per pet.
 */
export async function fetchPetsWithDetails(
  petIds: string[],
): Promise<PetWithDetails[]> {
  if (petIds.length === 0) return [];

  const { data, error } = await supabase
    .from("pets")
    .select(PET_WITH_DETAILS_SELECT)
    .in("id", petIds);

  if (error) throw error;

  const rows = (data ?? []) as unknown as PetDetailRow[];
  const litterByOwner = await fetchLitterGoalsByOwner(rows);
  return rows.map((row) => toPetWithDetails(row, litterByOwner));
}

export async function fetchPetProfile(
  petId: string,
): Promise<PetWithDetails | null> {
  const { data, error } = await supabase
    .from("pets")
    .select(PET_WITH_DETAILS_SELECT)
    .eq("id", petId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as PetDetailRow;
  const litterByOwner = await fetchLitterGoalsByOwner([row]);
  return toPetWithDetails(row, litterByOwner);
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

/** PostgREST schema-cache miss / undefined function — the migration isn't applied yet. */
function isMissingFunctionError(error: { code?: string | null }): boolean {
  return error.code === "PGRST202" || error.code === "42883";
}

/**
 * Persist the user's active-pet selection.
 *
 * Returns the pet that ended up active for the owner, which is the target for
 * owned pets and the owner's existing selection when the user picked a pet
 * they only co-care for (`is_active` belongs to the owner's account).
 *
 * The write is a single atomic statement server-side: doing it as
 * "set target, then clear the rest" let two quick taps interleave into a state
 * with no active pet at all, which silently reset the selection on next launch.
 */
export async function setActivePet(
  ownerId: string,
  petId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("set_pet_active_flag", {
    target_pet: petId,
  });

  if (!error) return typeof data === "string" ? data : null;
  if (!isMissingFunctionError(error)) throw error;

  return setActivePetLegacy(ownerId, petId);
}

/**
 * Pre-`set_pet_active_flag` path, kept so a client running ahead of the
 * migration still persists something. Only clears the other pets once the
 * target is confirmed owned, so co-care selections can't wipe the flag.
 */
async function setActivePetLegacy(
  ownerId: string,
  petId: string,
): Promise<string | null> {
  const { data: owned, error: setErr } = await supabase
    .from("pets")
    .update({ is_active: true })
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();
  if (setErr) throw setErr;
  if (!owned) return null;

  const { error: clearErr } = await supabase
    .from("pets")
    .update({ is_active: false })
    .eq("owner_id", ownerId)
    .neq("id", petId);
  if (clearErr) throw clearErr;

  return petId;
}

/** After delete or memorialization, ensure one living pet is `is_active` if any exist. */
export async function ensureOneActivePet(ownerId: string): Promise<void> {
  await repairActivePetSelection(ownerId);
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
