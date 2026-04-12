import {
  configureExpoPushNotificationHandler,
  ensureAndroidDefaultNotificationChannel,
} from "@/lib/pushNotifications";
import { useEffect } from "react";
import { Platform } from "react-native";

/**
 * Registers global notification behavior and Android channel once (native only).
 */
export default function PushNotificationBootstrap() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    configureExpoPushNotificationHandler();
    void ensureAndroidDefaultNotificationChannel();
  }, []);
  return null;
}
