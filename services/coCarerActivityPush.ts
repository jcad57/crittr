import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Best-effort remote push to other co-carers / owner (see edge `push-co-carer-activity`).
 * In-app notifications are always created by the DB trigger; this covers app-killed devices.
 */
export function requestRemoteCoCarerActivityPush(activityId: string): void {
  if (Platform.OS === "web") return;
  const id = activityId.trim();
  if (!id) return;

  void supabase.functions
    .invoke("push-co-carer-activity", {
      body: { activity_id: id },
    })
    .then(({ error }) => {
      if (error && __DEV__) {
        console.warn("[push-co-carer-activity]", error.message);
      }
    });
}
