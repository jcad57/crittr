import {
  allActivitiesKey,
  healthSnapshotKey,
  petVetVisitsQueryKey,
  todayActivitiesPrefixKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { deleteVetVisit } from "@/services/health";
import { Alert } from "react-native";

type DeletableActivity = {
  vet_visit_id?: string | null;
  pet_id?: string | null;
};

/** Deletes either an ordinary activity or its underlying vet visit, invalidating the
 * same query keys the screen previously invalidated inline. Returns true on success. */
export async function runActivityDeletion(params: {
  activity: DeletableActivity;
  activityId: string;
  userId: string | undefined;
  deleteActivity: (activityId: string) => Promise<unknown>;
}): Promise<boolean> {
  const { activity, activityId, userId, deleteActivity } = params;
  try {
    if (activity.vet_visit_id) {
      await deleteVetVisit(activity.vet_visit_id);
      if (activity.pet_id) {
        void queryClient.invalidateQueries({
          queryKey: petVetVisitsQueryKey(activity.pet_id),
        });
        void queryClient.invalidateQueries({
          queryKey: todayActivitiesPrefixKey(activity.pet_id),
        });
        void queryClient.invalidateQueries({
          queryKey: allActivitiesKey(activity.pet_id),
        });
      }
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: healthSnapshotKey(userId),
        });
      }
    } else {
      await deleteActivity(activityId);
    }
    return true;
  } catch {
    Alert.alert("Could not delete", "Please try again.");
    return false;
  }
}

/** Shows the destructive confirmation dialog, then runs the deletion. */
export function confirmActivityDeletion(params: {
  activity: DeletableActivity;
  activityId: string;
  userId: string | undefined;
  deleteActivity: (activityId: string) => Promise<unknown>;
  onDeleted: () => void;
}): void {
  const { activity, activityId, userId, deleteActivity, onDeleted } = params;
  Alert.alert("Delete activity?", "This cannot be undone.", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        const ok = await runActivityDeletion({
          activity,
          activityId,
          userId,
          deleteActivity,
        });
        if (ok) onDeleted();
      },
    },
  ]);
}
