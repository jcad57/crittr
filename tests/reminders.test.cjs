const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
function fixture(options = {}) {
  let generation = 0;
  const scheduled = [],
    cancelled = [];
  const module = loadTS("services/reminderNotificationSchedule.ts", {
    "@/lib/sessionGeneration": { sessionGeneration: () => generation },
    "@/lib/pushNotifications": {
      DEFAULT_ANDROID_CHANNEL_ID: "default",
      getNotificationPermissionStatus: async () => "granted",
    },
    "@/utils/medicationDueSchedule": {},
    "@/utils/medicationReminderTimes": {},
    "@/utils/exercisePlans": {},
    "@/utils/petFood": {
      dailyProgressFoodTarget: () => 1,
      isTreatFood: () => false,
      portionsForPetFood: () => [{ feed_time: "08:00" }],
    },
    "@/lib/supabase": { supabase: {} },
    "@/services/pets": {
      fetchAccessiblePets: async () => {
        if (options.offline) throw Error("offline");
        if (options.changed) generation++;
        return [{ id: "pet", name: "Pet" }];
      },
      fetchPetsWithDetails: async () => [
        { id: "pet", name: "Pet", foods: [{}] },
      ],
    },
    "@/services/activities": { fetchTodayActivitiesForPetIds: async () => [] },
    "react-native": { Platform: { OS: "ios" } },
    "expo-notifications": {
      PermissionStatus: { GRANTED: "granted" },
      SchedulableTriggerInputTypes: { DAILY: "daily", DATE: "date" },
      getAllScheduledNotificationsAsync: async () => [
        { identifier: "crittr-old" },
      ],
      cancelScheduledNotificationAsync: async (id) => cancelled.push(id),
      scheduleNotificationAsync: async (request) => {
        if (options.failed) throw Error("schedule failed");
        scheduled.push(request);
        return request.identifier;
      },
    },
  });
  return { module, scheduled, cancelled };
}
const prefs = { notify_meals_treats: true };
test("offline reminder rebuild preserves the installed schedule", async () => {
  const f = fixture({ offline: true });
  await assert.rejects(
    () => f.module.syncCrittrReminderNotifications("user", prefs),
    /offline/,
  );
  assert.deepEqual(f.scheduled, []);
  assert.deepEqual(f.cancelled, []);
});
test("failed notification installation does not remove working reminders", async () => {
  const f = fixture({ failed: true });
  await assert.rejects(
    () => f.module.syncCrittrReminderNotifications("user", prefs),
    /schedule failed/,
  );
  assert.deepEqual(f.cancelled, []);
});
test("reminders install per-account replacements before cancelling obsolete IDs", async () => {
  const f = fixture();
  await f.module.syncCrittrReminderNotifications("user", prefs);
  assert.equal(f.scheduled.length, 1);
  assert.equal(f.scheduled[0].identifier, "crittr-user-meals-pet");
  assert.deepEqual(f.cancelled, ["crittr-old"]);
});
test("account changes during fetch cannot replace or remove notifications", async () => {
  const f = fixture({ changed: true });
  await f.module.syncCrittrReminderNotifications("user", prefs);
  assert.deepEqual(f.scheduled, []);
  assert.deepEqual(f.cancelled, []);
});
