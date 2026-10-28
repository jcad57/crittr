import {
  configureExpoPushNotificationHandler,
  ensureAndroidDefaultNotificationChannel,
} from "@/lib/pushNotifications";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Network from "expo-network";
import { syncExpoPushTokenToSupabase } from "@/services/pushTokens";
import { useAuthStore } from "@/stores/authStore";
import { shouldPresentNotification } from "@/utils/pushNotificationPreferences";
import { initializeCareTimeZone } from "@/services/reminderNotificationSchedule";

/**
 * Registers global notification behavior and Android channel once (native only).
 */
export default function PushNotificationBootstrap() {
  const userId = useAuthStore((s) => s.session?.user.id);
  useEffect(() => {
    if (Platform.OS === "web" && userId) {
      void initializeCareTimeZone(userId).catch((error) => console.warn("[notifications] care time zone", error));
    }
  }, [userId]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    configureExpoPushNotificationHandler((data) => {
      const { session, profile } = useAuthStore.getState();
      return shouldPresentNotification(data, session?.user.id, profile);
    });
    void ensureAndroidDefaultNotificationChannel().catch((error) => console.warn("[notifications] Android channel", error));
  }, []);
  useEffect(() => {
    if (Platform.OS === "web" || !userId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let retry = 0;
    let pendingToken: Notifications.DevicePushToken | undefined;
    const register = async () => {
      if (disposed || running) return;
      running = true;
      const deviceToken = pendingToken;
      pendingToken = undefined;
      try {
        await syncExpoPushTokenToSupabase(userId, deviceToken);
        retry = 0;
      } catch (error) {
        console.warn("[notifications] registration", error);
        if (!disposed && retry < 3) timer = setTimeout(() => void register(), 2000 * 2 ** retry++);
      } finally {
        running = false;
        if (pendingToken && !disposed) void register();
      }
    };
    const refresh = () => {
      if (timer) clearTimeout(timer);
      retry = 0;
      void register();
    };
    timer = setTimeout(() => void register(), 2000);
    const app = AppState.addEventListener("change", (state) => { if (state === "active") refresh(); });
    const network = Network.addNetworkStateListener((state) => { if (state.isConnected && state.isInternetReachable !== false) refresh(); });
    const token = Notifications.addPushTokenListener((nativeToken) => {
      // Passing the event token avoids recursively requesting another native token.
      pendingToken = nativeToken;
      void register();
    });
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      app.remove(); network.remove(); token.remove();
    };
  }, [userId]);
  return null;
}
