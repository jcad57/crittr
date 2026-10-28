import {
  cancelCrittrScheduledNotifications,
  syncCrittrReminderNotifications,
} from "@/services/reminderNotificationSchedule";
import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { useAuthStore } from "@/stores/authStore";
import { notificationPrefsFromProfile } from "@/utils/pushNotificationPreferences";
import { queryClient } from "@/lib/query/client";
import * as Network from "expo-network";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

/**
 * Window inside which back-to-back sync triggers (resume + profile-driven prefs
 * change firing on the same tick) collapse into a single full reschedule.
 */
const SYNC_DEBOUNCE_MS = 300;

/**
 * Keeps Expo scheduled local notifications aligned with Supabase prefs + pet data.
 * Server-driven FCM (Firebase) can mirror the same rules later.
 */
export default function ReminderNotificationSync() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { data: profile } = useProfileQuery();
  const localYmd = useLocalCalendarYmd();
  const appStateRef = useRef(AppState.currentState);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRequestRef = useRef(0);

  const prefs = useMemo(
    () => (profile?.id === userId ? notificationPrefsFromProfile(profile) : null),
    [profile, userId],
  );

  const requestSync = useCallback(
    (label: string) => {
      if (Platform.OS === "web" || !userId || !prefs) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      const request = ++syncRequestRef.current;
      let retries = 0;
      const sync = async () => {
        debounceTimerRef.current = null;
        try {
          await syncCrittrReminderNotifications(userId, prefs);
        } catch (error) {
          console.warn(`[ReminderNotificationSync] ${label}`, error);
          if (request === syncRequestRef.current && retries < 3) {
            debounceTimerRef.current = setTimeout(() => void sync(), 2000 * 2 ** retries++);
          }
        }
      };
      debounceTimerRef.current = setTimeout(() => void sync(), label === "prefs/day" ? 2000 : SYNC_DEBOUNCE_MS);
    },
    [userId, prefs],
  );

  useEffect(() => {
    const requests = syncRequestRef;
    return () => {
      ++requests.current;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [userId, prefs]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!userId) void cancelCrittrScheduledNotifications();
  }, [userId]);

  /**
   * Vet-visit mirror sync is owned by `useLoggedInQueryBootstrap` — the same
   * function was being called in both places and running twice.
   */

  useEffect(() => {
    requestSync("prefs/day");
  }, [requestSync, localYmd]);

  useEffect(() => {
    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) requestSync("reconnect");
    });
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "invalidate") return;
      if (["pets", "petDetails", "todayActivities", "petVetVisits", "healthSnapshot"].includes(String(event.query.queryKey[0]))) requestSync("pet data");
    });
    return () => { network.remove(); unsubscribe(); };
  }, [requestSync]);

  useEffect(() => {
    if (Platform.OS === "web" || !userId || !prefs) return;
    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        const prev = appStateRef.current ?? "active";
        appStateRef.current = next;
        if (prev.match(/inactive|background/) && next === "active") {
          requestSync("resume");
        }
      },
    );
    return () => sub.remove();
  }, [userId, prefs, requestSync]);

  return null;
}
