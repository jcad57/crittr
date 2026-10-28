import { getNotificationPermissionStatus } from "@/lib/pushNotifications";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query/client";
import type { NotificationCategoryPrefs } from "@/utils/pushNotificationPreferences";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const CRITTR_NOTIF_ID_PREFIX = "crittr-";
type ReminderScheduleStatus = { userId: string; enabled: boolean; timeZone: string | null; missingOwnerTimeZones: number; error: string | null };
let scheduleStatus: ReminderScheduleStatus | null = null;
let revision = 0;
let cancellations = Promise.resolve();
const listeners = new Set<() => void>();
export function getReminderScheduleStatus() { return scheduleStatus; }
export function subscribeReminderScheduleStatus(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(status: ReminderScheduleStatus) {
  scheduleStatus = status;
  listeners.forEach((listener) => listener());
}
export function reportReminderSetupFailure(userId: string, error: unknown) {
  publish({ userId, enabled: false, timeZone: scheduleStatus?.userId === userId ? scheduleStatus.timeZone : null,
    missingOwnerTimeZones: scheduleStatus?.userId === userId ? scheduleStatus.missingOwnerTimeZones : 0,
    error: error instanceof Error ? error.message : "Notification setup failed. Refresh setup to retry." });
}

/** Keep one stable care zone for the owner, even if a second device is traveling. */
export async function initializeCareTimeZone(userId: string): Promise<void> {
  const generation = sessionGeneration();
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (generation !== sessionGeneration() || data.session?.user.id !== userId) return;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data: changed, error } = await supabase.rpc("initialize_care_time_zone", { p_time_zone: timeZone });
  if (error) throw error;
  if (changed === true && generation === sessionGeneration()) {
    void queryClient.invalidateQueries({ queryKey: ["pets"] });
    void queryClient.invalidateQueries({ queryKey: ["petDetails"] });
  }
}

/** Serial cancellation fences sign-out/account switching and never removes other apps' requests. */
export function cancelCrittrScheduledNotifications(preserveUserId?: string): Promise<void> {
  ++revision;
  return cancelInstalledCrittrNotifications(preserveUserId);
}
function cancelInstalledCrittrNotifications(preserveUserId?: string): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve();
  const work = cancellations.then(async () => {
    const installed = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of installed) {
      if (request.identifier.startsWith(CRITTR_NOTIF_ID_PREFIX) &&
          (!preserveUserId || !request.identifier.startsWith(`${CRITTR_NOTIF_ID_PREFIX}${preserveUserId}-`))) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }
  });
  cancellations = work.catch(() => {});
  return work;
}

/**
 * Task reminders are now scheduled by the server in the owner's care time zone.
 * Existing callers still refresh setup after permission/pref/task changes.
 * Native repeating alarms must be removed before this device opts into server delivery.
 */
export async function syncCrittrReminderNotifications(userId: string, _prefs?: NotificationCategoryPrefs): Promise<void> {
  const request = ++revision, generation = sessionGeneration();
  const current = () => request === revision && generation === sessionGeneration();
  try {
    await initializeCareTimeZone(userId);
    if (!current()) return;
    const { data, error } = await supabase.rpc("care_reminder_status");
    if (error) throw error;
    if (!current()) return;
    const status = data as { enabled?: boolean; time_zone?: string | null; missing_owner_time_zones?: number } | null;
    if (!status?.enabled) throw new Error("Server care reminders are awaiting activation. Update notification setup after the server rollout.");
    const permission = Platform.OS === "web" ? "granted" : await getNotificationPermissionStatus();
    if (!current()) return;
    // All future care reminders are remote. This also removes old consolidated
    // feeding alerts and generic nudges, so the two pipelines cannot both fire.
    await cancelInstalledCrittrNotifications();
    if (!current()) return;
    publish({ userId, enabled: permission === Notifications.PermissionStatus.GRANTED,
      timeZone: status.time_zone ?? null, missingOwnerTimeZones: status.missing_owner_time_zones ?? 0, error: null });
  } catch (error) {
    if (current()) publish({ userId, enabled: false, timeZone: null, missingOwnerTimeZones: 0,
      error: error instanceof Error ? error.message : "Reminder setup failed. Refresh setup to retry." });
    throw error;
  }
}
