import { supabase } from "@/lib/supabase";
import { fetchUserPets } from "@/services/pets";
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
  const pets = await fetchUserPets(ownerId);
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
