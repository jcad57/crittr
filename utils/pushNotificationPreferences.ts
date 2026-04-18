import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile } from "@/types/database";

const ONBOARDING_PROMPT_KEY = "crittr_push_onboarding_prompt_shown_v1";

/** Mirrors `profiles` notification columns (manage-notifications UI). */
export type NotificationCategoryPrefs = {
  notify_meals_treats: boolean;
  notify_co_care_activities: boolean;
  notify_medications: boolean;
  notify_vet_visits: boolean;
};

export function defaultNotificationCategoryPrefs(): NotificationCategoryPrefs {
  return {
    notify_meals_treats: true,
    notify_co_care_activities: true,
    notify_medications: true,
    notify_vet_visits: true,
  };
}

export function notificationPrefsFromProfile(
  p: Profile | null | undefined,
): NotificationCategoryPrefs {
  const d = defaultNotificationCategoryPrefs();
  if (!p) return d;
  return {
    notify_meals_treats: p.notify_meals_treats !== false,
    notify_co_care_activities: p.notify_co_care_activities !== false,
    notify_medications: p.notify_medications !== false,
    notify_vet_visits: p.notify_vet_visits !== false,
  };
}

export async function hasShownPostOnboardingPushPrompt(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ONBOARDING_PROMPT_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function markPostOnboardingPushPromptShown(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_PROMPT_KEY, "1");
}
