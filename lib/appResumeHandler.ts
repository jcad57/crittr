import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { AppState, Platform, type AppStateStatus } from "react-native";

/**
 * When the app has been backgrounded at least this long, treat it as a cold-ish resume:
 * cancel in-flight queries (they may be zombie fetches the OS suspended), invalidate
 * the cache so mounted queries refetch, and kick the Realtime socket back up.
 *
 * `focusManager` + `refetchOnWindowFocus` alone are not sufficient: React Query will
 * not start a new fetch while a previous one is still marked as in-flight, so without
 * an explicit cancel we stay stuck on whatever loader was visible pre-background.
 */
const STALE_AFTER_BACKGROUND_MS = 30_000;

export function setupAppResumeHandler(): () => void {
  if (Platform.OS === "web") return () => {};

  let lastBackgroundedAt: number | null = null;
  let lastState: AppStateStatus = AppState.currentState;

  const onChange = (next: AppStateStatus) => {
    const prev = lastState;
    lastState = next;

    if (prev === "active" && next !== "active") {
      lastBackgroundedAt = Date.now();
      return;
    }

    if (next !== "active" || prev === "active") return;

    const awayMs =
      lastBackgroundedAt != null ? Date.now() - lastBackgroundedAt : 0;
    lastBackgroundedAt = null;

    if (awayMs < STALE_AFTER_BACKGROUND_MS) return;

    /**
     * 1. Cancel in-flight queries. For queryFns that honor the AbortSignal this aborts
     *    the underlying fetch; for those that don't, React Query still discards the
     *    pending result so the next invalidate can start a fresh fetch.
     */
    void queryClient.cancelQueries();

    /** 2. Refetch everything that's currently mounted so the UI unsticks. */
    void queryClient.invalidateQueries();

    /**
     * 3. Nudge Realtime. iOS can silently tear down the WebSocket during background;
     *    the client can keep thinking it's connected and never re-subscribe channels.
     *    Disconnect + connect triggers channel rejoins via supabase-js's internal
     *    reconnect loop.
     */
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
