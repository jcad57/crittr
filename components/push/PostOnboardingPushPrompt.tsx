import { requestNotificationPermissionsAsync } from "@/lib/pushNotifications";
import { syncExpoPushTokenToSupabase } from "@/services/pushTokens";
import { syncCrittrReminderNotifications } from "@/services/reminderNotificationSchedule";
import { useAuthStore } from "@/stores/authStore";
import {
  hasShownPostOnboardingPushPrompt,
  markPostOnboardingPushPromptShown,
  notificationPrefsFromProfile,
} from "@/utils/pushNotificationPreferences";
import { useEffect } from "react";
import { Platform } from "react-native";

let postOnboardingPermissionPromptInFlight = false;

/**
 * After onboarding, the first time the user reaches the dashboard we prompt for OS
 * notification permission (push on by default at the preference level; OS dialog is required).
 * Android notification channel is set up once in `PushNotificationBootstrap`.
 */
export default function PostOnboardingPushPrompt() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let cancelled = false;
    (async () => {
      if (postOnboardingPermissionPromptInFlight) return;
      const already = await hasShownPostOnboardingPushPrompt();
      if (cancelled || already || postOnboardingPermissionPromptInFlight) return;
      postOnboardingPermissionPromptInFlight = true;
      try {
        await requestNotificationPermissionsAsync();
        if (!cancelled) await markPostOnboardingPushPromptShown();
        if (!cancelled && userId) {
          const profile = useAuthStore.getState().profile;
          if (profile) await syncCrittrReminderNotifications(userId, notificationPrefsFromProfile(profile));
          await syncExpoPushTokenToSupabase(userId);
        }
      } catch (error) {
        console.warn("[notifications] permission setup failed", error);
      } finally {
        postOnboardingPermissionPromptInFlight = false;
      }
    })().catch((error) => console.warn("[notifications] prompt failed", error));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
