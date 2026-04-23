import {
  DEFAULT_ANDROID_CHANNEL_ID,
  getNotificationPermissionStatus,
} from "@/lib/pushNotifications";
import { getMedicationReminderTimes } from "@/utils/medicationReminderTimes";
import { dailyProgressFoodTarget, isTreatFood, portionsForPetFood } from "@/utils/petFood";
import { supabase } from "@/lib/supabase";
import { fetchAccessiblePets, fetchPetProfile } from "@/services/pets";
import { fetchTodayActivitiesForPetIds } from "@/services/activities";
import type {
  PetFood,
  PetFoodPortion,
  PetMedication,
  PetVetVisit,
  PetWithDetails,
} from "@/types/database";
import type { NotificationCategoryPrefs } from "@/utils/pushNotificationPreferences";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const CRITTR_NOTIF_ID_PREFIX = "crittr-";

const MEAL_AFTER_MIN = 5;
const MED_BEFORE_MIN = 5;
const VET_BEFORE_MS = 60 * 60 * 1000;
const ACTIVITY_NUDGE_HOUR = 15;
const ACTIVITY_NUDGE_MINUTE = 0;

function parsePgTimeToHourMinute(t: string): { hour: number; minute: number } {
  const parts = t.trim().split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

function addMinutes(
  hour: number,
  minute: number,
  delta: number,
): { hour: number; minute: number } {
  let total = hour * 60 + minute + delta;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

function parseReminderHHmm(
  raw: string | null | undefined,
): { hour: number; minute: number } | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { hour: h, minute: min };
}

export async function cancelCrittrScheduledNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(CRITTR_NOTIF_ID_PREFIX))
      .map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier),
      ),
  );
}

function petExerciseIncomplete(
  detail: PetWithDetails,
  todayActs: { pet_id: string; activity_type: string }[],
): boolean {
  if (detail.is_memorialized) return false;
  const target =
    detail.exercises_per_day ?? detail.exercise?.walks_per_day ?? 0;
  if (target <= 0) return false;
  const done = todayActs.filter(
    (a) =>
      a.pet_id === detail.id && a.activity_type === "exercise",
  ).length;
  return done < target;
}

async function scheduleMealsForFood(
  petName: string,
  petId: string,
  food: PetFood,
  portion: PetFoodPortion,
): Promise<void> {
  const { hour, minute } = parsePgTimeToHourMinute(portion.feed_time);
  const { hour: h, minute: m } = addMinutes(hour, minute, MEAL_AFTER_MIN);
  const label = isTreatFood(food) ? "treat" : "meal";
  const foodBit = food.brand?.trim() || label;
  await Notifications.scheduleNotificationAsync({
    identifier: `${CRITTR_NOTIF_ID_PREFIX}meal-${petId}-${food.id}-${portion.id}`,
    content: {
      title: isTreatFood(food) ? "Treat reminder" : "Meal reminder",
      body: `${petName}: time for a ${label} (${foodBit}).`,
      data: { type: "meal_reminder", petId, foodId: food.id },
      ...(Platform.OS === "android"
        ? { sound: "default", channelId: DEFAULT_ANDROID_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: h,
      minute: m,
    },
  });
}

async function scheduleMedication(
  petName: string,
  petId: string,
  med: PetMedication,
): Promise<void> {
  const slots = getMedicationReminderTimes(med);
  const medName = med.name.trim() || "medication";
  for (let i = 0; i < slots.length; i++) {
    const t = parseReminderHHmm(slots[i]);
    if (!t) continue;
    const { hour: h, minute: m } = addMinutes(
      t.hour,
      t.minute,
      -MED_BEFORE_MIN,
    );
    await Notifications.scheduleNotificationAsync({
      identifier: `${CRITTR_NOTIF_ID_PREFIX}med-${med.id}-${i}`,
      content: {
        title: "Medication reminder",
        body: `${petName}: time to give ${medName} (dose due in about ${MED_BEFORE_MIN} minutes).`,
        data: { type: "medication_reminder", petId, medicationId: med.id },
        ...(Platform.OS === "android"
          ? { sound: "default", channelId: DEFAULT_ANDROID_CHANNEL_ID }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: h,
        minute: m,
      },
    });
  }
}

async function scheduleVetVisit(
  petName: string,
  visit: PetVetVisit,
): Promise<void> {
  const at = new Date(visit.visit_at).getTime();
  const fireAt = at - VET_BEFORE_MS;
  if (fireAt <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier: `${CRITTR_NOTIF_ID_PREFIX}vet-${visit.id}`,
    content: {
      title: "Vet visit coming up",
      body: `${petName}: ${visit.title.trim() || "Vet visit"} in about an hour.`,
      data: { type: "vet_reminder", petId: visit.pet_id, visitId: visit.id },
      ...(Platform.OS === "android"
        ? { sound: "default", channelId: DEFAULT_ANDROID_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
    },
  });
}

async function scheduleActivityNudge(petNames: string[]): Promise<void> {
  const now = new Date();
  const target = new Date(now);
  target.setHours(ACTIVITY_NUDGE_HOUR, ACTIVITY_NUDGE_MINUTE, 0, 0);
  if (now.getTime() >= target.getTime()) return;

  const names =
    petNames.length <= 2
      ? petNames.join(" and ")
      : `${petNames.slice(0, 2).join(", ")} and others`;

  await Notifications.scheduleNotificationAsync({
    identifier: `${CRITTR_NOTIF_ID_PREFIX}activity-nudge`,
    content: {
      title: "Activity check-in",
      body: `You still have exercise goals to log today for ${names}.`,
      data: { type: "activity_nudge" },
      ...(Platform.OS === "android"
        ? { sound: "default", channelId: DEFAULT_ANDROID_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
    },
  });
}

async function fetchUpcomingVetVisits(petIds: string[]): Promise<PetVetVisit[]> {
  if (petIds.length === 0) return [];
  const { data, error } = await supabase
    .from("pet_vet_visits")
    .select("*")
    .in("pet_id", petIds)
    .gte("visit_at", new Date().toISOString())
    .order("visit_at", { ascending: true });

  if (error) {
    if (__DEV__) console.warn("[reminderSchedule] vet visits", error);
    return [];
  }
  return (data ?? []) as PetVetVisit[];
}

/**
 * Rebuilds all Crittr local notifications from Supabase data + profile prefs.
 * Call after login, foreground, prefs change, or when calendar day may have changed.
 */
export async function syncCrittrReminderNotifications(
  userId: string,
  prefs: NotificationCategoryPrefs,
): Promise<void> {
  if (Platform.OS === "web") return;

  await cancelCrittrScheduledNotifications();

  const perm = await getNotificationPermissionStatus();
  if (perm !== Notifications.PermissionStatus.GRANTED) return;

  const pets = await fetchAccessiblePets(userId);
  const activePets = pets.filter((p) => !p.is_memorialized);
  if (activePets.length === 0) return;

  const petIds = activePets.map((p) => p.id);
  const detailsList = (
    await Promise.all(petIds.map((id) => fetchPetProfile(id)))
  ).filter(Boolean) as PetWithDetails[];

  const todayActs = await fetchTodayActivitiesForPetIds(petIds);

  if (prefs.notify_meals_treats) {
    for (const d of detailsList) {
      for (const food of d.foods) {
        const portions = portionsForPetFood(food);
        if (portions.length > 0) {
          for (const portion of portions) {
            await scheduleMealsForFood(d.name, d.id, food, portion);
          }
        } else if (isTreatFood(food)) {
          const n = dailyProgressFoodTarget(food);
          if (n > 0) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${CRITTR_NOTIF_ID_PREFIX}treat-fallback-${d.id}-${food.id}`,
              content: {
                title: "Treat reminder",
                body: `${d.name}: don't forget today's treats.`,
                data: { type: "treat_reminder", petId: d.id, foodId: food.id },
                ...(Platform.OS === "android"
                  ? { sound: "default", channelId: DEFAULT_ANDROID_CHANNEL_ID }
                  : {}),
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: 20,
                minute: 0,
              },
            });
          }
        }
      }
    }
  }

  if (prefs.notify_medications) {
    for (const d of detailsList) {
      for (const med of d.medications) {
        await scheduleMedication(d.name, d.id, med);
      }
    }
  }

  if (prefs.notify_vet_visits) {
    const visits = await fetchUpcomingVetVisits(petIds);
    const petNameById = new Map(detailsList.map((p) => [p.id, p.name]));
    for (const v of visits) {
      await scheduleVetVisit(petNameById.get(v.pet_id) ?? "Your pet", v);
    }
  }

  if (prefs.notify_co_care_activities) {
    const incomplete = detailsList.filter((d) =>
      petExerciseIncomplete(d, todayActs),
    );
    if (incomplete.length > 0) {
      await scheduleActivityNudge(incomplete.map((p) => p.name));
    }
  }
}
