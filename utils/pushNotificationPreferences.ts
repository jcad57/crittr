import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile } from "@/types/database";

const ONBOARDING_PROMPT_KEY = "crittr_push_onboarding_prompt_shown_v1";

/** Mirrors `profiles` notification columns (manage-notifications UI). */
export type NotificationCategoryPrefs = {
  notify_meals_treats: boolean;
  notify_co_care_activities: boolean;
  notify_medications: boolean;
  notify_vet_visits: boolean;
  notify_vaccinations: boolean;
};

export const NOTIFICATION_PREF_KEYS = [
  "notify_meals_treats",
  "notify_co_care_activities",
  "notify_medications",
  "notify_vet_visits",
  "notify_vaccinations",
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
  const livePrefs = notificationPrefsFromProfile(liveCache);
  const serverPrefs = notificationPrefsFromProfile(serverRow);
  for (const k of NOTIFICATION_PREF_KEYS) {
    const lc = livePrefs[k];
    const sr = serverPrefs[k];
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
    notify_vaccinations: true,
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
    notify_vaccinations: p.notify_vaccinations == null
      ? !(p.notify_meals_treats === false && p.notify_co_care_activities === false && p.notify_medications === false && p.notify_vet_visits === false)
      : p.notify_vaccinations !== false,
  };
}

/** Recheck queued/foreground alerts against the current account and preferences. */
export function shouldPresentNotification(
  data: Record<string, unknown>,
  userId: string | undefined,
  profile: Profile | null | undefined,
): boolean {
  if (!userId || profile?.id !== userId) return false;
  if (typeof data.recipient_user_id === "string" && data.recipient_user_id !== userId) return false;
  const prefs = notificationPrefsFromProfile(profile);
  switch (data.type) {
    case "care_task_due": {
      const category = data.category;
      return typeof category === "string" && NOTIFICATION_PREF_KEYS.includes(category as NotificationPrefColumnKey)
        && prefs[category as NotificationPrefColumnKey];
    }
    case "meal_reminder":
    case "treat_reminder": return prefs.notify_meals_treats;
    case "medication_reminder": return prefs.notify_medications;
    case "vet_reminder": return prefs.notify_vet_visits;
    case "vaccination_reminder": return prefs.notify_vaccinations;
    default: return prefs.notify_co_care_activities;
  }
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
