import Constants from "expo-constants";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";

/**
 * Registers this device with Expo and upserts `user_expo_push_tokens` so edge functions
 * can send remote pushes (e.g. co-carer activity alerts) when the app isn’t running.
 */
export async function syncExpoPushTokenToSupabase(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== Notifications.PermissionStatus.GRANTED) return;

  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId;
  if (!projectId || typeof projectId !== "string") {
    if (__DEV__) console.warn("[pushTokens] Missing EAS projectId in app config.");
    return;
  }

  let token: string;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    token = res.data?.trim() ?? "";
  } catch (e) {
    if (__DEV__) console.warn("[pushTokens] getExpoPushTokenAsync", e);
    return;
  }

  if (!token) return;

  const { error } = await supabase.from("user_expo_push_tokens").upsert(
    {
      user_id: userId,
      expo_push_token: token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error && __DEV__) console.warn("[pushTokens] upsert", error.message);
}
