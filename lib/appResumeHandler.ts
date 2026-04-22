import {
  consumeAppForegroundedAwayMs,
  noteAppBackgrounded,
  STALE_RESUME_AFTER_MS,
} from "@/lib/appLifecycle";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { AppState, Platform, type AppStateStatus } from "react-native";

/**
 * When the app has been backgrounded at least `STALE_RESUME_AFTER_MS`, treat it
 * as a cold-ish resume: cancel in-flight queries (they may be zombie fetches the
 * OS suspended), invalidate active (mounted) queries so the visible UI refetches,
 * and kick the Realtime socket back up.
 *
 * `focusManager` + `refetchOnWindowFocus` alone are not sufficient: React Query
 * will not start a new fetch while a previous one is still marked as in-flight,
 * so without an explicit cancel we stay stuck on whatever loader was visible
 * pre-background. We also restrict invalidation to `refetchType: "active"` so
 * inactive (unmounted) queries don't all refetch in the background — they will
 * fetch fresh next time they're observed.
 */

export function setupAppResumeHandler(): () => void {
  if (Platform.OS === "web") return () => {};

  let lastState: AppStateStatus = AppState.currentState;

  const onChange = (next: AppStateStatus) => {
    const prev = lastState;
    lastState = next;

    if (prev === "active" && next !== "active") {
      noteAppBackgrounded(Date.now());
      return;
    }

    if (next !== "active" || prev === "active") return;

    const awayMs = consumeAppForegroundedAwayMs();
    if (awayMs < STALE_RESUME_AFTER_MS) return;

    void queryClient.cancelQueries();
    void queryClient.invalidateQueries({ refetchType: "active" });

    try {
      supabase.realtime.disconnect();
      supabase.realtime.connect();
    } catch {
      /** never let resume housekeeping throw up to the app. */
    }
  };

  const sub = AppState.addEventListener("change", onChange);
  return () => sub.remove();
}
