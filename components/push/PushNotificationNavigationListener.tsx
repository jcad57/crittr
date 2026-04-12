import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

type NotificationPayload = {
  href?: string;
};

/**
 * Routes when the user taps a notification (best-effort; payload must include `href`).
 */
export default function PushNotificationNavigationListener() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") return;

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content
          .data as NotificationPayload | null;
        const href = data?.href;
        if (href && typeof href === "string") {
          router.push(href as Href);
        }
      },
    );

    return () => sub.remove();
  }, [router]);

  return null;
}
