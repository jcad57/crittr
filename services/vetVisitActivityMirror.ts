import {
  allActivitiesKey,
  healthSnapshotKey,
  petsQueryKey,
  todayActivitiesPrefixKey,
} from "@/lib/query/keys";
import { queryClient } from "@/lib/query/client";
import { ensureTodayVetVisitMirrorActivities } from "@/services/activities";
import { fetchAccessiblePets } from "@/services/pets";

/**
 * Materialize today's vet visits into `pet_activities` (if missing) and refresh
 * the activity queries that would now be showing the wrong thing.
 *
 * On most launches there is nothing to mirror. Invalidating unconditionally
 * threw away the data the bootstrap prefetch had just loaded and forced a
 * second round of fetches, so refreshes are now scoped to pets that actually
 * changed.
 */
export async function syncTodayVetVisitMirrorsToActivities(
  userId: string,
): Promise<void> {
  /** Shares the bootstrap's in-flight pets request instead of issuing another. */
  const pets = await queryClient.fetchQuery({
    queryKey: petsQueryKey(userId),
    queryFn: () => fetchAccessiblePets(userId),
  });

  const { changedPetIds } = await ensureTodayVetVisitMirrorActivities(
    userId,
    pets,
  );

  if (changedPetIds.length === 0) return;

  void queryClient.invalidateQueries({ queryKey: healthSnapshotKey(userId) });
  for (const id of changedPetIds) {
    void queryClient.invalidateQueries({
      queryKey: todayActivitiesPrefixKey(id),
    });
    void queryClient.invalidateQueries({ queryKey: allActivitiesKey(id) });
  }
}
