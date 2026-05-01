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

export const NOTIFICATION_PREF_KEYS = [
  "notify_meals_treats",
  "notify_co_care_activities",
  "notify_medications",
  "notify_vet_visits",
] as const satisfies readonly (keyof NotificationCategoryPrefs)[];

export type NotificationPrefColumnKey = (typeof NOTIFICATION_PREF_KEYS)[number];

/** DB + UI normalization — matches `notificationPrefsFromProfile`. */
export function coerceNotificationPrefColumn(value: unknown): boolean {
  return value !== false;
}

/** Rows where normalized targets differ — used after a stale server payload. */
export function notificationPrefsDelta(
  target: NotificationCategoryPrefs,
  baseline: NotificationCategoryPrefs,
): Partial<NotificationCategoryPrefs> {
  const d: Partial<NotificationCategoryPrefs> = {};
  for (const k of NOTIFICATION_PREF_KEYS) {
    if (target[k] !== baseline[k]) {
      (d as Record<NotificationPrefColumnKey, boolean>)[k] = target[k];
    }
  }
  return d;
}

export function notificationPrefsDeltaFromProfiles(
  target: NotificationCategoryPrefs,
  baselineProfile: Profile | null | undefined,
): Partial<NotificationCategoryPrefs> {
  return notificationPrefsDelta(
    target,
    notificationPrefsFromProfile(baselineProfile),
  );
}

/** Keep live cache booleans after a PATCH response arrived while toggles raced ahead. */
export function mergeNotificationColumnsPreferLiveCache(
  serverRow: Profile,
  liveCache: Profile | null | undefined,
): Profile {
  if (!liveCache) return serverRow;
  const out: Profile = { ...serverRow };
  for (const k of NOTIFICATION_PREF_KEYS) {
    const lc = coerceNotificationPrefColumn(liveCache[k]);
    const sr = coerceNotificationPrefColumn(serverRow[k]);
    if (lc !== sr) {
      (out as Record<NotificationPrefColumnKey, boolean>)[k] = lc;
    }
  }
  return out;
}

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
