import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuthStore } from "@/stores/authStore";
import { notificationTarget } from "@/lib/navigation/notificationTarget";


/**
 * Routes when the user taps a notification (best-effort; payload must include `href`).
 */
export default function PushNotificationNavigationListener() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user.id);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web" || !userId) return;
    let disposed = false;
    const routeResponse = (response: Notifications.NotificationResponse | null) => {
      if (!response || disposed || useAuthStore.getState().session?.user.id !== userId) return;
      const request = response.notification.request;
      const key = `${request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
      if (handled.current === key) return;
      handled.current = key;
      const href = notificationTarget(request.content.data, userId);
      if (href) router.push(href as Href);
      void Notifications.clearLastNotificationResponseAsync().catch(() => {});
    };
    const sub = Notifications.addNotificationResponseReceivedListener(routeResponse);
    // The response listener alone misses a tap that launches a terminated app.
    void Notifications.getLastNotificationResponseAsync().then(routeResponse)
      .catch((error) => console.warn("[notifications] launch response", error));
    return () => { disposed = true; sub.remove(); };
  }, [router, userId]);

  return null;
}
