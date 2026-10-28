import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";

export const DEFAULT_ANDROID_CHANNEL_ID = "default";

/**
 * Foreground notification presentation (Expo docs). Device styling is otherwise default.
 */
export function configureExpoPushNotificationHandler(
  shouldPresent: (data: Record<string, unknown>) => boolean = () => true,
): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const enabled = shouldPresent(notification.request.content.data ?? {});
      return {
        shouldPlaySound: enabled,
        shouldSetBadge: enabled,
        shouldShowBanner: enabled,
        shouldShowList: enabled,
      };
    },
  });
}

export async function ensureAndroidDefaultNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(DEFAULT_ANDROID_CHANNEL_ID, {
    name: "Default",
    importance: AndroidImportance.HIGH,
    sound: "default",
  });
}

export async function getNotificationPermissionStatus(): Promise<Notifications.PermissionStatus> {
  if (Platform.OS === "web") return Notifications.PermissionStatus.GRANTED;
  const permission = await Notifications.getPermissionsAsync();
  return permission.granted || permission.ios?.status === IosAuthorizationStatus.PROVISIONAL
    ? Notifications.PermissionStatus.GRANTED
    : permission.status;
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
  // Android 13 must have a channel before requesting its notification permission.
  await ensureAndroidDefaultNotificationChannel();
  return Notifications.requestPermissionsAsync();
}
