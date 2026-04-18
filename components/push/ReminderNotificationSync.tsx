import {
  cancelCrittrScheduledNotifications,
  syncCrittrReminderNotifications,
} from "@/lib/reminderNotificationSchedule";
import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { useAuthStore } from "@/stores/authStore";
import { notificationPrefsFromProfile } from "@/utils/pushNotificationPreferences";
import { useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";

/**
 * Keeps Expo scheduled local notifications aligned with Supabase prefs + pet data.
 * Server-driven FCM (Firebase) can mirror the same rules later.
 */
export default function ReminderNotificationSync() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { data: profile } = useProfileQuery();
  const localYmd = useLocalCalendarYmd();
  const appStateRef = useRef(AppState.currentState);

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

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!userId) void cancelCrittrScheduledNotifications();
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === "web" || !userId || !prefs) return;
    void (async () => {
      try {
        await syncCrittrReminderNotifications(userId, prefs);
      } catch (e) {
        if (__DEV__) console.warn("[ReminderNotificationSync]", e);
      }
    })();
  }, [userId, prefs, localYmd]);

  useEffect(() => {
    if (Platform.OS === "web" || !userId || !prefs) return;
    const sub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = next;
        if (prev.match(/inactive|background/) && next === "active") {
          void syncCrittrReminderNotifications(userId, prefs).catch((e) => {
            if (__DEV__) console.warn("[ReminderNotificationSync] resume", e);
          });
        }
      },
    );
    return () => sub.remove();
  }, [userId, prefs]);

  return null;
}
