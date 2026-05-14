import {
  DEFAULT_ANDROID_CHANNEL_ID,
  getNotificationPermissionStatus,
} from "@/lib/pushNotifications";
import {
  dueSoonScheduleKind,
  enumerateUpcomingMedicationDueDates,
} from "@/utils/medicationDueSchedule";
import { getMedicationReminderTimes } from "@/utils/medicationReminderTimes";
import { dailyProgressFoodTarget, isTreatFood, portionsForPetFood } from "@/utils/petFood";
import { supabase } from "@/lib/supabase";
import { fetchAccessiblePets, fetchPetProfile } from "@/services/pets";
import { fetchTodayActivitiesForPetIds } from "@/services/activities";
import type {
  PetFood,
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

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
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

/**
 * One gentle daily nudge per pet after the latest configured feed/treat time
 * (avoids one notification per portion / per missing serving).
 */
async function scheduleConsolidatedFeedingReminder(
  petName: string,
  petId: string,
  foods: PetFood[],
): Promise<void> {
  type Slot = { hour: number; minute: number; isTreat: boolean };
  const slots: Slot[] = [];

  for (const food of foods) {
    const portions = portionsForPetFood(food);
    const treat = isTreatFood(food);
    if (portions.length > 0) {
      for (const portion of portions) {
        const { hour, minute } = parsePgTimeToHourMinute(portion.feed_time);
        const { hour: h, minute: m } = addMinutes(
          hour,
          minute,
          MEAL_AFTER_MIN,
        );
        slots.push({ hour: h, minute: m, isTreat: treat });
      }
    } else if (treat && dailyProgressFoodTarget(food) > 0) {
      slots.push({ hour: 20, minute: 0, isTreat: true });
    }
  }

  if (slots.length === 0) return;

  let bestSlot = slots[0]!;
  let bestT = -1;
  for (const s of slots) {
    const t = s.hour * 60 + s.minute;
    if (t >= bestT) {
      bestSlot = s;
      bestT = t;
    }
  }

  const hasTreat = slots.some((s) => s.isTreat);
  const hasMeal = slots.some((s) => !s.isTreat);
  const title =
    hasTreat && hasMeal
      ? "Meal & treat reminder"
      : hasTreat
        ? "Treat reminder"
        : "Meal reminder";

  await Notifications.scheduleNotificationAsync({
    identifier: `${CRITTR_NOTIF_ID_PREFIX}meals-${petId}`,
    content: {
      title,
      body: `${petName}: gentle reminder to log today's meals and treats if you haven't yet.`,
      data: { type: "meal_reminder", petId },
      ...(Platform.OS === "android"
        ? { sound: "default", channelId: DEFAULT_ANDROID_CHANNEL_ID }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: bestSlot.hour,
      minute: bestSlot.minute,
    },
  });
}

function formatMedicationBatchReminderBody(
  petName: string,
  medNames: string[],
): string {
  const sorted = [...medNames].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  let namesPart: string;
  if (sorted.length === 1) {
    namesPart = sorted[0]!;
  } else if (sorted.length === 2) {
    namesPart = `${sorted[0]!} and ${sorted[1]!}`;
  } else {
    const last = sorted[sorted.length - 1]!;
    namesPart = `${sorted.slice(0, -1).join(", ")}, and ${last}`;
  }
  const doseWord = sorted.length === 1 ? "dose" : "doses";
  return `${petName}: time to give ${namesPart} (${doseWord} due in about ${MED_BEFORE_MIN} minutes).`;
}

type SlotMed = { medicationId: string; name: string };

function mergeUniqueSlotMeds(list: SlotMed[], addition: SlotMed): SlotMed[] {
  if (list.some((x) => x.medicationId === addition.medicationId)) return list;
  return [...list, addition];
}

/**
 * Daily meds: one notification per reminder time (multiple meds at the same time batched).
 * Interval meds (weekly/monthly/custom): DATE triggers only on scheduled due days.
 */
async function scheduleMedicationsForPet(
  petName: string,
  petId: string,
  medications: PetMedication[],
): Promise<void> {
  const dailyByTrigger = new Map<string, SlotMed[]>();
  const dateByKey = new Map<
    string,
    { fireAt: Date; slotMeds: SlotMed[] }
  >();
  const nowMs = Date.now();

  for (const med of medications) {
    const slots = getMedicationReminderTimes(med);
    if (slots.length === 0) continue;

    const medName = med.name.trim() || "medication";
    const slotMed: SlotMed = { medicationId: med.id, name: medName };
    const isDaily = dueSoonScheduleKind(med) === "daily";

    for (const slot of slots) {
      const t = parseReminderHHmm(slot);
      if (!t) continue;
      const { hour: h, minute: m } = addMinutes(
        t.hour,
        t.minute,
        -MED_BEFORE_MIN,
      );
      const triggerKey = `${h}-${m}`;

      if (isDaily) {
        const list = dailyByTrigger.get(triggerKey) ?? [];
        dailyByTrigger.set(triggerKey, mergeUniqueSlotMeds(list, slotMed));
      } else {
        const dueDays = enumerateUpcomingMedicationDueDates(med);
        for (const dueDay of dueDays) {
          const ymd = formatLocalYmd(dueDay);
          const mergeKey = `${ymd}|${triggerKey}`;
          const fireAt = new Date(dueDay);
          fireAt.setHours(h, m, 0, 0);
          if (fireAt.getTime() <= nowMs) continue;

          const prev = dateByKey.get(mergeKey);
          if (prev) {
            dateByKey.set(mergeKey, {
              fireAt: prev.fireAt,
              slotMeds: mergeUniqueSlotMeds(prev.slotMeds, slotMed),
            });
          } else {
            dateByKey.set(mergeKey, {
              fireAt,
              slotMeds: mergeUniqueSlotMeds([], slotMed),
            });
          }
        }
      }
    }
  }

  for (const [triggerKey, slotMeds] of dailyByTrigger) {
    if (slotMeds.length === 0) continue;
    const [hStr, mStr] = triggerKey.split("-");
    const h = parseInt(hStr!, 10);
    const m = parseInt(mStr!, 10);
    const ids = slotMeds.map((x) => x.medicationId).sort();
    await Notifications.scheduleNotificationAsync({
      identifier: `${CRITTR_NOTIF_ID_PREFIX}med-${petId}-${h}-${m}`,
      content: {
        title: "Medication reminder",
        body: formatMedicationBatchReminderBody(
          petName,
          slotMeds.map((x) => x.name),
        ),
        data: {
          type: "medication_reminder",
          petId,
          medicationIds: ids,
          ...(ids.length === 1 ? { medicationId: ids[0]! } : {}),
        },
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

  for (const [mergeKey, { fireAt, slotMeds }] of dateByKey) {
    if (slotMeds.length === 0) continue;
    const ids = slotMeds.map((x) => x.medicationId).sort();
    const safeId = mergeKey.replace(/\|/g, "--");
    await Notifications.scheduleNotificationAsync({
      identifier: `${CRITTR_NOTIF_ID_PREFIX}med-date-${petId}-${safeId}`,
      content: {
        title: "Medication reminder",
        body: formatMedicationBatchReminderBody(
          petName,
          slotMeds.map((x) => x.name),
        ),
        data: {
          type: "medication_reminder",
          petId,
          medicationIds: ids,
          ...(ids.length === 1 ? { medicationId: ids[0]! } : {}),
        },
        ...(Platform.OS === "android"
          ? { sound: "default", channelId: DEFAULT_ANDROID_CHANNEL_ID }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
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
      await scheduleConsolidatedFeedingReminder(d.name, d.id, d.foods);
    }
  }

  if (prefs.notify_medications) {
    for (const d of detailsList) {
      await scheduleMedicationsForPet(d.name, d.id, d.medications);
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
