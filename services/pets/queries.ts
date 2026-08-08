/** Reads of pets: the owner’s list, everything shared with them, and profiles. */

import { supabase } from "@/lib/supabase";
import type {
  CoCarePermissions,
  LitterCleaningPeriod,
  Pet,
  PetWithDetails,
  PetWithRole,
} from "@/types/database";

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
