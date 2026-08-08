import { useSetActivePetMutation } from "@/hooks/mutations/useSetActivePetMutation";
import { usePetsQuery } from "@/hooks/queries/usePetsQuery";
import { usePetStore } from "@/stores/petStore";
import type { PetWithRole } from "@/types/database";
import type { PetSummary } from "@/types/ui";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import { useCallback, useMemo } from "react";

export type ActivePetState = {
  /**
   * Resolved selection. Never points at a pet that is missing from
   * `livingPets`, so screens can feed it straight into per-pet queries.
   */
  activePetId: string | null;
  livingPets: PetWithRole[];
  /** View models for the pill / avatar switchers, in list order. */
  pets: PetSummary[];
  /** True once the pets query has produced a list, from cache or network. */
  petsLoaded: boolean;
  hasNoPets: boolean;
  switchPet: (petId: string) => void;
};

/**
 * Single source of truth for "which pet am I looking at".
 *
 * `petStore.activePetId` is the selection, but it starts empty on a cold start
 * and `initActivePetFromList` only catches up once the pets query resolves.
 * Resolving the fallback here — rather than per screen — keeps the Dashboard
 * and Schedule tabs on the same pet during that first frame and after a pet is
 * memorialized out from under the selection.
 */
export function useActivePet(): ActivePetState {
  const storedPetId = usePetStore((s) => s.activePetId);
  const { data: dbPets } = usePetsQuery();
  const { mutate: setActivePet } = useSetActivePetMutation();

  const livingPets = useMemo(
    () => (dbPets ?? []).filter(isPetActiveForDashboard),
    [dbPets],
  );

  const activePetId = useMemo(() => {
    if (livingPets.length === 0) return dbPets != null ? null : storedPetId;
    if (storedPetId && livingPets.some((p) => p.id === storedPetId)) {
      return storedPetId;
    }
    /** Same precedence as `initActivePetFromList`, so no pet flashes twice. */
    return livingPets.find((p) => p.is_active)?.id ?? livingPets[0]?.id ?? null;
  }, [storedPetId, livingPets, dbPets]);

  const pets = useMemo<PetSummary[]>(
    () =>
      livingPets.map((p) => ({
        id: p.id,
        name: p.name,
        breed: p.breed ?? "",
        imageUrl: p.avatar_url,
      })),
    [livingPets],
  );

  const switchPet = useCallback(
    (petId: string) => {
      if (petId === activePetId) return;
      setActivePet(petId);
    },
    [activePetId, setActivePet],
  );

  return {
    activePetId,
    livingPets,
    pets,
    petsLoaded: dbPets != null,
    hasNoPets: dbPets != null && livingPets.length === 0,
    switchPet,
  };
}
