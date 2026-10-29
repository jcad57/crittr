const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const { schedulePlan, pet, food, medication } = require("./care-plan-fixture.cjs");
const planner = loadTS("supabase/functions/_shared/careReminderPlan.ts", {
  "../../../utils/buildSchedulePlan.ts": schedulePlan,
});
const input = (fields = {}) => ({ pet: pet(), time_zone: "America/Chicago", vet_visits: [], version: "version", ...fields });
const at = (localTime) => planner.careWallTimeToDate("2026-10-28", localTime, "America/Chicago");

test("each morning/evening meal and treat slot produces its own due event at task time", () => {
  const value = input({ pet: pet({ foods: [food("meals", ["06:30", "18:15"]), food("treats", ["11:00", "20:00"], true)] }) });
  const events = ["06:30", "11:00", "18:15", "20:00"].flatMap((time) => planner.buildDueCareReminders(value, at(time)));
  assert.equal(events.length, 4);
  assert.equal(new Set(events.map((e) => `${e.source_id}:${e.source_slot}`)).size, 4);
  assert.equal(events.filter((e) => e.title === "Treat reminder").length, 2);
  assert.ok(events.every((e) => e.category === "notify_meals_treats"));
});

test("medication events use every saved dose time and deduplicate equivalent clock formats", () => {
  const value = input({ pet: pet({ medications: [medication({ doses_per_period: 1, reminder_times: ["8:00", "08:00", "20:00"] })] }) });
  assert.equal(planner.buildDueCareReminders(value, at("08:00")).length, 1);
  assert.equal(planner.buildDueCareReminders(value, at("20:00")).length, 1);
  assert.equal(planner.buildDueCareReminders(value, at("07:59")).length, 0);
});

test("interval medications only generate on their due dates; last-given occurrences are suppressed", () => {
  const value = input({ pet: pet({ medications: [medication({ dose_period: "week", last_given_on: "2026-10-21", reminder_time: "08:00" })] }) });
  assert.equal(planner.buildDueCareReminders(value, at("08:00")).length, 1);
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-29T13:00:00Z")).length, 0);
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-21T13:00:00Z")).length, 0);
});

test("an imported explicit next due date anchors an interval medication when no last dose is known", () => {
  const value = input({ pet: pet({ medications: [medication({ dose_period: "month", last_given_on: null, next_due_date: "2026-10-29", reminder_time: "08:00" })] }) });
  assert.equal(planner.buildDueCareReminders(value, at("08:00")).length, 0);
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-29T13:00:00Z")).length, 1);
});

test("exercise days and times match the visible schedule", () => {
  const value = input({ pet: pet({ exercise_plans: [{ id: "walk", label: "Walk", scheduled_time: "07:45", days_of_week: [3] }] }) });
  assert.equal(planner.buildDueCareReminders(value, at("07:45")).length, 1);
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-29T12:45:00Z")).length, 0);
});

test("vet reminders occur exactly 24 hours and 1 hour before the absolute appointment", () => {
  const value = input({ vet_visits: [{ id: "visit", title: "Checkup", visit_at: "2026-10-29T18:00:00Z", created_at: "2026-10-01T12:00:00Z" }] });
  for (const hours of [24, 1]) {
    const now = new Date(Date.parse(value.vet_visits[0].visit_at) - hours * 3600_000);
    const events = planner.buildDueCareReminders(value, now);
    assert.equal(events.length, 1);
    assert.equal(events[0].scheduled_at, now.toISOString());
    assert.equal(events[0].reminder_key, `${hours}h`);
    assert.equal(events[0].local_date, "2026-10-29");
  }
});

test("vaccine reminders are 9 AM in the owner's zone one week before and on expiration", () => {
  const value = input({ pet: pet({ vaccinations: [{ id: "vac", pet_id: "pet", name: "Rabies", expires_on: "2026-11-04", created_at: "2026-01-01T12:00:00Z" }] }) });
  const week = planner.buildDueCareReminders(value, at("09:00"));
  const due = planner.buildDueCareReminders(value, new Date("2026-11-04T15:00:00Z"));
  assert.equal(week[0].reminder_key, "7d");
  assert.equal(due[0].reminder_key, "0d");
  assert.equal(week[0].category, "notify_vaccinations");
  assert.match(due[0].body, /expires today/);
});

test("the owner's time zone determines the reminder instant regardless of the recipient's zone", () => {
  const value = input({ time_zone: "America/New_York", pet: pet({ foods: [food()] }) });
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-28T12:00:00Z"))[0].scheduled_at, "2026-10-28T12:00:00.000Z");
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-28T15:00:00Z")).length, 0);
});

test("DST overlap chooses the first occurrence and spring gaps advance without a second alert", () => {
  assert.equal(planner.careWallTimeToDate("2026-11-01", "01:30", "America/Chicago").toISOString(), "2026-11-01T06:30:00.000Z");
  assert.equal(planner.careWallTimeToDate("2026-03-08", "02:30", "America/Chicago").toISOString(), "2026-03-08T08:30:00.000Z");
});

test("planning catches a brief outage across midnight, but never replays old or not-yet-created tasks", () => {
  const value = input({ pet: pet({ foods: [food("late", ["23:45"])] }) });
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-29T05:10:00Z")).length, 1);
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-29T07:00:00Z")).length, 0);
  value.pet.foods[0].created_at = "2026-10-29T05:00:00Z";
  assert.equal(planner.buildDueCareReminders(value, new Date("2026-10-29T05:10:00Z")).length, 0);
  assert.equal(planner.buildDueCareReminders({ ...value, time_zone: null }, at("09:00")).length, 0);
});

function setupFixture(options = {}) {
  let generation = 0;
  let installed = options.installed ?? [{ identifier: "crittr-old" }, { identifier: "other-app" }];
  const cancelled = [], calls = [];
  const module = loadTS("services/reminderNotificationSchedule.ts", {
    "@/lib/sessionGeneration": { sessionGeneration: () => generation },
    "@/lib/query/client": { queryClient: { invalidateQueries: async () => {} } },
    "@/lib/pushNotifications": { getNotificationPermissionStatus: async () => options.permission ?? "granted" },
    "@/lib/supabase": { supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: "user" } } } }) },
      rpc: async (name) => {
        calls.push(name);
        if (options.failed) return { error: Error("offline") };
        if (options.changed) generation++;
        return { data: { enabled: options.enabled !== false, time_zone: "America/Chicago", missing_owner_time_zones: options.missingOwnerTimeZones ?? 0 } };
      },
    } },
    "react-native": { Platform: { OS: "ios" } },
    "expo-notifications": {
      PermissionStatus: { GRANTED: "granted" },
      getAllScheduledNotificationsAsync: async () => installed,
      cancelScheduledNotificationAsync: async (id) => { cancelled.push(id); installed = installed.filter((n) => n.identifier !== id); },
    },
  });
  return { module, cancelled, calls };
}
test("server setup removes every legacy reminder before this device can enable remote care delivery", async () => {
  const f = setupFixture();
  await f.module.syncCrittrReminderNotifications("user");
  assert.deepEqual(f.cancelled, ["crittr-old"]);
  assert.equal(f.module.getReminderScheduleStatus().enabled, true);
});
test("partial shared-pet setup is reported instead of claiming all reminders are ready", async () => {
  const f = setupFixture({ missingOwnerTimeZones: 1 });
  await f.module.syncCrittrReminderNotifications("user");
  assert.equal(f.module.getReminderScheduleStatus().enabled, true, "other configured pets must keep receiving reminders");
  assert.equal(f.module.getReminderScheduleStatus().missingOwnerTimeZones, 1);
  assert.match(f.module.getReminderScheduleStatus().error, /shared-pet reminders are paused/);
});
test("failed or unactivated rollout preserves installed reminders and exposes a setup error", async () => {
  for (const options of [{ failed: true }, { enabled: false }]) {
    const f = setupFixture(options);
    await assert.rejects(() => f.module.syncCrittrReminderNotifications("user"));
    assert.equal(f.cancelled.length, 0);
    assert.ok(f.module.getReminderScheduleStatus().error);
  }
});
test("a switched account cannot cancel another session's reminders", async () => {
  const f = setupFixture({ changed: true });
  await f.module.syncCrittrReminderNotifications("user");
  assert.equal(f.cancelled.length, 0);
});
test("session restoration only preserves the signed-in user's existing reminders", async () => {
  const f = setupFixture({ installed: [{ identifier: "crittr-user-meal" }, { identifier: "crittr-other-meal" }] });
  await f.module.cancelCrittrScheduledNotifications("user");
  assert.deepEqual(f.cancelled, ["crittr-other-meal"]);
});
