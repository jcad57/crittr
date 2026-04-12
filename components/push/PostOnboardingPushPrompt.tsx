import {
  ensureAndroidDefaultNotificationChannel,
  requestNotificationPermissionsAsync,
} from "@/lib/pushNotifications";
import {
  hasShownPostOnboardingPushPrompt,
  markPostOnboardingPushPromptShown,
} from "@/utils/pushNotificationPreferences";
import { useEffect } from "react";
import { Platform } from "react-native";

let postOnboardingPermissionPromptInFlight = false;

/**
 * After onboarding, the first time the user reaches the dashboard we prompt for OS
 * notification permission (push on by default at the preference level; OS dialog is required).
 */
export default function PostOnboardingPushPrompt() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;
    (async () => {
      if (postOnboardingPermissionPromptInFlight) return;
      const already = await hasShownPostOnboardingPushPrompt();
      if (cancelled || already) return;
      postOnboardingPermissionPromptInFlight = true;
      try {
        await ensureAndroidDefaultNotificationChannel();
        await requestNotificationPermissionsAsync();
        if (!cancelled) await markPostOnboardingPushPromptShown();
      } finally {
        postOnboardingPermissionPromptInFlight = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
