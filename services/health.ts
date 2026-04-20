import { supabase } from "@/lib/supabase";
import { fetchAccessiblePets } from "@/services/pets";
import type {
  Pet,
  PetMedication,
  PetVaccination,
  PetVetVisit,
} from "@/types/database";

export type MedicationWithPet = PetMedication & { pet: Pet };
export type VaccinationWithPet = PetVaccination & { pet: Pet };
export type VetVisitWithPet = PetVetVisit & { pet: Pet };

export type OwnerHealthSnapshot = {
  pets: Pet[];
  medications: MedicationWithPet[];
  vaccinations: VaccinationWithPet[];
  vetVisits: VetVisitWithPet[];
};

function attachPet<T extends { pet_id: string }>(
  rows: T[],
  petMap: Map<string, Pet>,
): (T & { pet: Pet })[] {
  const out: (T & { pet: Pet })[] = [];
  for (const row of rows) {
    const pet = petMap.get(row.pet_id);
    if (pet) out.push({ ...row, pet });
  }
  return out;
}

export async function fetchOwnerHealthSnapshot(
  ownerId: string,
): Promise<OwnerHealthSnapshot> {
  const petsWithRole = await fetchAccessiblePets(ownerId);
  const pets = petsWithRole.map(
    ({ role: _r, permissions: _p, ...pet }) => pet,
  );
  if (pets.length === 0) {
    return {
      pets: [],
      medications: [],
      vaccinations: [],
      vetVisits: [],
    };
  }

  const petMap = new Map(pets.map((p) => [p.id, p]));
  const ids = pets.map((p) => p.id);

  const { data: medRows, error: medErr } = await supabase
    .from("pet_medications")
    .select("*")
    .in("pet_id", ids);

  if (medErr) throw medErr;

  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const [vacRes, visitRes] = await Promise.all([
    supabase.from("pet_vaccinations").select("*").in("pet_id", ids),
    supabase
      .from("pet_vet_visits")
      .select("*")
      .in("pet_id", ids)
      .gte("visit_at", startToday.toISOString())
      .order("visit_at", { ascending: true }),
  ]);

  const medications = attachPet(
    (medRows ?? []) as PetMedication[],
    petMap,
  );
  const vaccinations = attachPet(
    vacRes.error ? [] : ((vacRes.data ?? []) as PetVaccination[]),
    petMap,
  );
  const vetVisits = attachPet(
    visitRes.error ? [] : ((visitRes.data ?? []) as PetVetVisit[]),
    petMap,
  );

  return {
    pets,
    medications,
    vaccinations,
    vetVisits,
  };
}

export type CreateVetVisitInput = {
  pet_id: string;
  title: string;
  visit_at: Date;
  /** Clinic name, address, etc. */
  location?: string | null;
  notes?: string | null;
};

export async function createVetVisit(
  input: CreateVetVisitInput,
): Promise<PetVetVisit> {
  const { data, error } = await supabase
    .from("pet_vet_visits")
    .insert({
      pet_id: input.pet_id,
      title: input.title.trim(),
      visit_at: input.visit_at.toISOString(),
      location: input.location?.trim() ? input.location.trim() : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PetVetVisit;
}

export async function fetchPetVetVisits(petId: string): Promise<PetVetVisit[]> {
  const { data, error } = await supabase
    .from("pet_vet_visits")
    .select("*")
    .eq("pet_id", petId)
    .order("visit_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetVetVisit[];
}

export type UpdateVetVisitInput = {
  id: string;
  title: string;
  visit_at: Date;
  location: string | null;
  notes: string | null;
};

export async function updateVetVisit(
  input: UpdateVetVisitInput,
): Promise<PetVetVisit> {
  const { data, error } = await supabase
    .from("pet_vet_visits")
    .update({
      title: input.title.trim(),
      visit_at: input.visit_at.toISOString(),
      location: input.location?.trim() ? input.location.trim() : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .eq("id", input.id)
    .select()
    .single();

  if (error) throw error;
  return data as PetVetVisit;
}

export async function deleteVetVisit(id: string): Promise<void> {
  const { error } = await supabase.from("pet_vet_visits").delete().eq("id", id);
  if (error) throw error;
}

export type CreatePetVaccinationInput = {
  pet_id: string;
  name: string;
  expires_on: string | null;
  frequency_label: string | null;
  notes: string | null;
  /** All optional — added by migration 037 for structured vet-record fields. */
  administered_on?: string | null;
  administered_by?: string | null;
  lot_number?: string | null;
  next_due_date?: string | null;
};

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createPetVaccination(
  input: CreatePetVaccinationInput,
): Promise<PetVaccination> {
  const name = input.name.trim();
  if (!name) throw new Error("Vaccination name is required");

  const { data, error } = await supabase
    .from("pet_vaccinations")
    .insert({
      pet_id: input.pet_id,
      name,
      expires_on: input.expires_on,
      frequency_label: normalizeOptionalText(input.frequency_label),
      notes: normalizeOptionalText(input.notes),
      administered_on: input.administered_on ?? null,
      administered_by: normalizeOptionalText(input.administered_by),
      lot_number: normalizeOptionalText(input.lot_number),
      next_due_date: input.next_due_date ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PetVaccination;
}

export type UpdatePetVaccinationInput = {
  name: string;
  expires_on: string | null;
  frequency_label: string | null;
  notes: string | null;
  administered_on?: string | null;
  administered_by?: string | null;
  lot_number?: string | null;
  next_due_date?: string | null;
};

export async function updatePetVaccination(
  petId: string,
  vaccinationId: string,
  input: UpdatePetVaccinationInput,
): Promise<PetVaccination> {
  const name = input.name.trim();
  if (!name) throw new Error("Vaccination name is required");

  const { data, error } = await supabase
    .from("pet_vaccinations")
    .update({
      name,
      expires_on: input.expires_on,
      frequency_label: normalizeOptionalText(input.frequency_label),
      notes: normalizeOptionalText(input.notes),
      administered_on: input.administered_on ?? null,
      administered_by: normalizeOptionalText(input.administered_by),
      lot_number: normalizeOptionalText(input.lot_number),
      next_due_date: input.next_due_date ?? null,
    })
    .eq("id", vaccinationId)
    .eq("pet_id", petId)
    .select()
    .single();

  if (error) throw error;
  return data as PetVaccination;
}

export async function deletePetVaccination(
  petId: string,
  vaccinationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("pet_vaccinations")
    .delete()
    .eq("id", vaccinationId)
    .eq("pet_id", petId);

  if (error) throw error;
}
