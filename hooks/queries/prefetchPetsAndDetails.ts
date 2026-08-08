import { fetchAccessiblePets, fetchPetsWithDetails } from "@/services/pets";
import type { PetWithRole } from "@/types/database";
import type { QueryClient } from "@tanstack/react-query";
import { petDetailsQueryKey, petsQueryKey } from "./queryKeys";

/**
 * Warm every pet's detail cache from a single request.
 *
 * Switching pets, opening a pet profile, and the dashboard's daily progress all
 * read `petDetailsQueryKey`, so seeding them up front makes those transitions
 * render instantly. Details already in cache are left alone — a background
 * refresh should not blow away data a screen is currently rendering.
 */
const warmingPetIds = new Set<string>();

export async function warmPetDetailsCache(
  queryClient: QueryClient,
  pets: PetWithRole[],
): Promise<void> {
  const missingIds = pets
    .map((p) => p.id)
    .filter(
      (id) =>
        !warmingPetIds.has(id) &&
        queryClient.getQueryData(petDetailsQueryKey(id)) == null,
    );

  if (missingIds.length === 0) return;

  /** Several screens observe the pets list at once; only one should warm it. */
  missingIds.forEach((id) => warmingPetIds.add(id));

  try {
    const details = await fetchPetsWithDetails(missingIds);
    for (const detail of details) {
      queryClient.setQueryData(petDetailsQueryKey(detail.id), detail);
    }
  } catch (e) {
    /** Each screen still fetches its own pet on demand; this is only a head start. */
    if (__DEV__) console.warn("[warmPetDetailsCache]", e);
  } finally {
    missingIds.forEach((id) => warmingPetIds.delete(id));
  }
}

/** Prefetch the accessible-pets list, then warm each pet's details from it. */
export async function prefetchPetsAndDetails(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  const key = petsQueryKey(userId);

  await queryClient.prefetchQuery({
    queryKey: key,
    queryFn: () => fetchAccessiblePets(userId),
  });

  const pets = queryClient.getQueryData<PetWithRole[]>(key);
  if (pets?.length) await warmPetDetailsCache(queryClient, pets);
}
