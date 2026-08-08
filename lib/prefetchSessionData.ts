import { prefetchPetsAndDetails } from "@/hooks/queries/prefetchPetsAndDetails";
import { fetchHealthSnapshotUsingCachedPets } from "@/hooks/queries/useHealthSnapshotQuery";
import {
  crittrAiThreadKey,
  healthSnapshotKey,
  petsQueryKey,
  profileQueryKey,
  unreadNotificationCountKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { fetchCrittrAiThread } from "@/services/crittrAi";
import { fetchUnreadNotificationCount } from "@/services/notifications";
import { fetchProfile } from "@/services/profiles";
import { prefetchScheduleDay, warmScheduleForPets } from "@/services/schedule";
import { usePetStore } from "@/stores/petStore";
import type { PetWithRole } from "@/types/database";
import { getLocalYmd } from "@/utils/localCalendarDate";
import { isPetActiveForDashboard } from "@/utils/petParticipation";

/**
 * Everything the logged-in shell needs, requested the moment we know who the
 * user is.
 *
 * This runs from `authStore` rather than a mounted component so the requests
 * overlap the remaining boot work (fonts, router mount, first render) instead
 * of starting a full round trip after the tab is already on screen.
 */
export function prefetchLoggedInSessionData(userId: string): Promise<void> {
  const warm = Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: profileQueryKey(userId),
      queryFn: () => fetchProfile(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: unreadNotificationCountKey(userId),
      queryFn: () => fetchUnreadNotificationCount(userId),
    }),
    queryClient.prefetchQuery({
      queryKey: crittrAiThreadKey(userId),
      queryFn: () => fetchCrittrAiThread(userId),
    }),
    /**
     * The health snapshot reads the pets list out of the cache, so it has to
     * follow the pets prefetch to avoid fetching that list a second time.
     * Today's schedule rides the same chain so the Schedule tab paints from
     * cache on first open.
     */
    prefetchPetsAndDetails(queryClient, userId).then(async () => {
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: healthSnapshotKey(userId),
          queryFn: () => fetchHealthSnapshotUsingCachedPets(userId),
        }),
        prefetchTodaySchedules(userId),
      ]);
    }),
  ]);

  return warm.then(() => undefined);
}

/**
 * Today's schedule for the pet we'll land on, then the rest of the household so
 * the first pet switch is a cache read rather than a round trip.
 */
async function prefetchTodaySchedules(userId: string): Promise<void> {
  const pets = queryClient.getQueryData<PetWithRole[]>(petsQueryKey(userId));
  if (!pets?.length) return;

  const living = pets.filter((p) => isPetActiveForDashboard(p));
  if (!living.length) return;

  const storedId = usePetStore.getState().activePetId;
  const petId =
    (storedId && living.some((p) => p.id === storedId) ? storedId : null) ??
    living.find((p) => p.is_active)?.id ??
    living[0]!.id;
  const todayYmd = getLocalYmd();

  await prefetchScheduleDay(petId, todayYmd);
  await warmScheduleForPets(
    living.filter((p) => p.id !== petId).map((p) => p.id),
    todayYmd,
  );
}
