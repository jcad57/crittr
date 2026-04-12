import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const DEFAULT_ANDROID_CHANNEL_ID = "default";

/**
 * Foreground notification presentation (Expo docs). Device styling is otherwise default.
 */
export function configureExpoPushNotificationHandler(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function ensureAndroidDefaultNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  if (Platform.OS === "web") return Notifications.PermissionStatus.GRANTED;
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermissionsAsync(): Promise<Notifications.NotificationPermissionsStatus> {
  if (Platform.OS === "web") {
    return {
      status: Notifications.PermissionStatus.GRANTED,
      granted: true,
      expires: "never",
      canAskAgain: false,
    };
  }
  return Notifications.requestPermissionsAsync();
}
