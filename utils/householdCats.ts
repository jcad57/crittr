import type { PetWithRole } from "@/types/database";
import { isPetActiveForDashboard } from "@/utils/petParticipation";

/** Active cats sharing the same household as `activePetOwnerId` (for litter progress). */
export function householdActiveCatIds(
  pets: PetWithRole[],
  activePetOwnerId: string | null | undefined,
): string[] {
  if (!activePetOwnerId) return [];
  return pets
    .filter(
      (p) =>
        p.pet_type === "cat" &&
        p.owner_id === activePetOwnerId &&
        isPetActiveForDashboard(p),
    )
    .map((p) => p.id);
}

/** True if the user has at least one active cat (any pet list: owned or co-cared). */
export function userHasAnyActiveCat(pets: PetWithRole[] | undefined): boolean {
  if (!pets?.length) return false;
  return pets.some((p) => p.pet_type === "cat" && isPetActiveForDashboard(p));
}
