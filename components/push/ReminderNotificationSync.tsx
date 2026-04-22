import {
  cancelCrittrScheduledNotifications,
  syncCrittrReminderNotifications,
} from "@/lib/reminderNotificationSchedule";
import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { useAuthStore } from "@/stores/authStore";
import { notificationPrefsFromProfile } from "@/utils/pushNotificationPreferences";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

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

  const prefs = useMemo(
    () => (profile ? notificationPrefsFromProfile(profile) : null),
    [
      profile?.notify_meals_treats,
      profile?.notify_co_care_activities,
      profile?.notify_medications,
      profile?.notify_vet_visits,
      profile?.updated_at,
    ],
  );

  const requestSync = useCallback(
    (label: string) => {
      if (Platform.OS === "web" || !userId || !prefs) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void syncCrittrReminderNotifications(userId, prefs).catch((e) => {
          if (__DEV__) console.warn(`[ReminderNotificationSync] ${label}`, e);
        });
      }, SYNC_DEBOUNCE_MS);
    },
    [userId, prefs],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

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
    if (Platform.OS === "web" || !userId || !prefs) return;
    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        const prev = appStateRef.current;
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
