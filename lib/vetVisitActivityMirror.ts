import {
  allActivitiesKey,
  healthSnapshotKey,
  todayActivitiesPrefixKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { ensureTodayVetVisitMirrorActivities } from "@/services/activities";

/** Materialize today’s vet visits into `pet_activities` (if missing) and refresh activity queries. */
export async function syncTodayVetVisitMirrorsToActivities(
  userId: string,
): Promise<void> {
  const { petIds } = await ensureTodayVetVisitMirrorActivities(userId);
  void queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
  void queryClient.invalidateQueries({
    queryKey: healthSnapshotKey(userId),
  });
  for (const id of petIds) {
    void queryClient.invalidateQueries({
      queryKey: todayActivitiesPrefixKey(id),
    });
    void queryClient.invalidateQueries({
      queryKey: allActivitiesKey(id),
    });
  }
}
