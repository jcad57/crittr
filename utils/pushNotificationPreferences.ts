import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "crittr_push_notification_prefs_v1";
const ONBOARDING_PROMPT_KEY = "crittr_push_onboarding_prompt_shown_v1";

export type PushNotificationPrefs = {
  remindersEnabled: boolean;
  activitiesEnabled: boolean;
};

const DEFAULT_PREFS: PushNotificationPrefs = {
  remindersEnabled: true,
  activitiesEnabled: true,
};

export function getDefaultPushPrefs(): PushNotificationPrefs {
  return { ...DEFAULT_PREFS };
}

export async function loadPushNotificationPrefs(): Promise<PushNotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return getDefaultPushPrefs();
    const parsed = JSON.parse(raw) as Partial<PushNotificationPrefs>;
    return {
      remindersEnabled:
        typeof parsed.remindersEnabled === "boolean"
          ? parsed.remindersEnabled
          : DEFAULT_PREFS.remindersEnabled,
      activitiesEnabled:
        typeof parsed.activitiesEnabled === "boolean"
          ? parsed.activitiesEnabled
          : DEFAULT_PREFS.activitiesEnabled,
    };
  } catch {
    return getDefaultPushPrefs();
  }
}

export async function savePushNotificationPrefs(
  prefs: PushNotificationPrefs,
): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
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
