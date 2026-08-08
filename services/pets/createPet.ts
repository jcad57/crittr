/**
 * Creating a pet and everything the onboarding form collects alongside it:
 * foods, medications, vaccinations, exercise plans and a co-carer invite.
 *
 * One long transaction-shaped function rather than several, because the child
 * rows are only meaningful with the pet and the retry story depends on them
 * being written under the same idempotency key.
 */

import { supabase } from "@/lib/supabase";
import { sendCoCareInvite } from "@/services/coCare";
import {
  extensionForContentType,
  inferImageContentType,
  readLocalImageUriAsArrayBuffer,
} from "@/services/localImageUpload";
import {
  exercisePlanFormEntryToInput,
  replacePetExercisePlans,
} from "@/services/petExercisePlans";
import { foodFormEntryToUpsertInput, insertPetFood } from "@/services/petFoods";
import type { Pet, PetFormData } from "@/types/database";
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
