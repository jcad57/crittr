import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";
import { secureStorage } from "@/lib/secureStorage";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { withTimeout } from "@/utils/async";
import { ensureAndroidDefaultNotificationChannel, getNotificationPermissionStatus } from "@/lib/pushNotifications";
import { cancelCrittrScheduledNotifications, initializeCareTimeZone, reportReminderSetupFailure, syncCrittrReminderNotifications } from "@/services/reminderNotificationSchedule";

const REGISTERED_TOKEN_KEY = "crittr.pushRegistration";
let registrationWork = Promise.resolve();

/** Register each device independently; fence native/network work after account changes. */
export function syncExpoPushTokenToSupabase(userId: string, devicePushToken?: Notifications.DevicePushToken): Promise<void> {
  const generation = sessionGeneration();
  const work = registrationWork.then(async () => {
    if (generation === sessionGeneration()) await registerDevice(userId, devicePushToken);
  }).catch((error) => {
    if (generation === sessionGeneration()) reportReminderSetupFailure(userId, error);
    throw error;
  });
  registrationWork = work.catch(() => {});
  return work;
}

async function registerDevice(userId: string, devicePushToken?: Notifications.DevicePushToken): Promise<void> {
  if (Platform.OS === "web") return;
  const generation = sessionGeneration();
  await initializeCareTimeZone(userId);
  await ensureAndroidDefaultNotificationChannel();
  if (await getNotificationPermissionStatus() !== Notifications.PermissionStatus.GRANTED) {
    await cancelCrittrScheduledNotifications();
    await unregisterExpoPushToken(userId);
    return;
  }
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error("Missing EAS project ID for push registration.");
  const result = await withTimeout(Notifications.getExpoPushTokenAsync({ projectId, devicePushToken }), 12_000, "Register push notifications");
  if (generation !== sessionGeneration()) return;
  const token = result.data?.trim();
  if (!token) throw new Error("Push registration did not return a token.");
  const { data } = await supabase.auth.getSession();
  if (generation !== sessionGeneration() || data.session?.user.id !== userId) return;
  const { error } = await supabase.rpc("register_expo_push_token", { p_token: token });
  if (error) throw error;
  // If logout overtook the RPC, remove the registration while its JWT may still be usable.
  if (generation !== sessionGeneration()) {
    await supabase.from("user_expo_push_devices").delete().eq("user_id", userId).eq("expo_push_token", token);
    return;
  }
  // Retire a rotated Expo token from this installation. Keeping both can send
  // duplicate activity alerts to one physical device; other devices stay intact.
  const previousRaw = await secureStorage.getItem(REGISTERED_TOKEN_KEY);
  if (previousRaw && generation === sessionGeneration()) {
    const previous = JSON.parse(previousRaw) as { userId: string; token: string };
    if (previous.userId === userId && previous.token !== token) {
      const { error: cleanupError } = await supabase.from("user_expo_push_devices").delete()
        .eq("user_id", userId).eq("expo_push_token", previous.token);
      if (cleanupError) throw cleanupError;
    }
  }
  if (generation !== sessionGeneration()) return;
  await secureStorage.setItem(REGISTERED_TOKEN_KEY, JSON.stringify({ userId, token }));
  await syncCrittrReminderNotifications(userId);
  if (generation !== sessionGeneration()) return;
  const { error: activationError } = await supabase.rpc("activate_device_care_reminders", { p_token: token });
  if (activationError) throw activationError;
}

/** Called before clearing auth; removing this device leaves other devices registered. */
export async function unregisterExpoPushToken(userId: string): Promise<void> {
  const raw = await secureStorage.getItem(REGISTERED_TOKEN_KEY);
  if (!raw) return;
  const registration = JSON.parse(raw) as { userId: string; token: string };
  if (registration.userId !== userId) return;
  const { error } = await supabase.from("user_expo_push_devices").delete()
    .eq("user_id", userId).eq("expo_push_token", registration.token);
  if (error) throw error;
  const { error: legacyError } = await supabase.from("user_expo_push_tokens").delete()
    .eq("user_id", userId).eq("expo_push_token", registration.token);
  if (legacyError) throw legacyError;
  // A timed-out logout may finish after the next account has registered.
  if (await secureStorage.getItem(REGISTERED_TOKEN_KEY) === raw) {
    await secureStorage.removeItem(REGISTERED_TOKEN_KEY);
  }
}
