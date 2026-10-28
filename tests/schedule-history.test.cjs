const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");

process.env.TZ = "America/Chicago";
const calendar = loadTS("utils/localCalendarDate.ts");
const dates = loadTS("utils/scheduleDateRange.ts", {
  "@/utils/localCalendarDate": calendar,
});
const { unlinkedActivitiesForScheduleDay } = loadTS(
  "utils/pastScheduleActivities.ts",
  { "@/utils/localCalendarDate": calendar },
);

const activity = (id, logged_at, pet_id = "milo") => ({
  id,
  pet_id,
  logged_at,
  label: id,
  activity_type: "food",
});
const slot = (activity_id, local_date = "2026-10-27", pet_id = "milo") => ({
  id: `slot-${activity_id}`,
  activity_id,
  local_date,
  pet_id,
});

test("a past day with no saved schedule still shows its real logged activities", () => {
  const meals = [
    activity("breakfast", "2026-10-27T13:30:00Z"),
    activity("dinner", "2026-10-27T23:30:00Z"),
  ];
  assert.deepEqual(
    unlinkedActivitiesForScheduleDay(meals, [], "milo", "2026-10-27"),
    meals,
  );
  assert.equal(meals.length, 2, "history is read without mutating it");
});

test("linked schedule entries are not repeated in past-day activity history", () => {
  const breakfast = activity("breakfast", "2026-10-27T13:30:00Z");
  const dinner = activity("dinner", "2026-10-27T23:30:00Z");
  const saved = slot("breakfast");
  assert.deepEqual(
    unlinkedActivitiesForScheduleDay(
      [breakfast, dinner],
      [saved],
      "milo",
      "2026-10-27",
    ),
    [dinner],
  );
  assert.equal(saved.activity_id, "breakfast");
});

test("rapid pet/date changes cannot display another pet or day from a cache", () => {
  const correct = activity("correct", "2026-10-27T14:00:00Z");
  const rows = [
    activity("wrong-pet", "2026-10-27T14:00:00Z", "luna"),
    activity("wrong-day", "2026-10-28T14:00:00Z"),
    activity("invalid", "invalid"),
    correct,
    correct,
  ];
  assert.deepEqual(
    unlinkedActivitiesForScheduleDay(rows, [], "milo", "2026-10-27"),
    [correct],
  );
});

test("local day boundaries include a late-evening log whose UTC date is tomorrow", () => {
  const late = activity("late", "2026-10-28T04:59:59Z");
  const tomorrow = activity("tomorrow", "2026-10-28T05:00:00Z");
  assert.deepEqual(
    unlinkedActivitiesForScheduleDay(
      [late, tomorrow],
      [],
      "milo",
      "2026-10-27",
    ),
    [late],
  );
});

test("following today rolls forward at midnight while an explicitly selected past date stays fixed", () => {
  assert.equal(
    dates.selectedScheduleYmd(null, "2026-10-28", "2026-10-01"),
    "2026-10-28",
  );
  assert.equal(
    dates.selectedScheduleYmd(null, "2026-10-29", "2026-10-01"),
    "2026-10-29",
  );
  assert.equal(
    dates.selectedScheduleYmd("2026-10-27", "2026-10-29", "2026-10-01"),
    "2026-10-27",
  );
});

test("signup-date resolution and next-week arrows keep the visible selection and query date in range", () => {
  assert.equal(
    dates.selectedScheduleYmd("2026-09-01", "2026-10-28", "2026-10-15"),
    "2026-10-15",
  );
  assert.equal(
    dates.selectedScheduleYmd("2028-01-01", "2026-10-28", "2026-10-15"),
    "2027-01-26",
  );
  assert.equal(
    dates.clampScheduleYmd("2026-10-01", "2026-10-15", "2027-01-26"),
    "2026-10-15",
  );
});

test("calendar day math stays correct through daylight saving and month/year changes", () => {
  assert.equal(dates.addDaysToYmd("2026-10-31", 1), "2026-11-01");
  assert.equal(dates.addDaysToYmd("2026-11-01", 1), "2026-11-02");
  assert.equal(dates.daysBetweenYmd("2026-10-31", "2026-11-02"), 2);
  assert.equal(dates.addDaysToYmd("2026-12-31", 1), "2027-01-01");
});

test("history fetch uses the complete 25-hour local day during autumn daylight saving", async () => {
  const calls = [];
  const query = {
    select: (...args) => {
      calls.push(["select", ...args]);
      return query;
    },
    eq: (...args) => {
      calls.push(["eq", ...args]);
      return query;
    },
    gte: (...args) => {
      calls.push(["gte", ...args]);
      return query;
    },
    lte: (...args) => {
      calls.push(["lte", ...args]);
      return query;
    },
    order: async () => ({ data: [], error: null }),
  };
  const service = loadTS("services/activities/queries.ts", {
    "@/lib/supabase": { supabase: { from: () => query } },
  });
  await service.fetchActivitiesForPetOnDay("milo", "2026-11-01");
  assert.ok(
    calls.some(
      (call) => call[0] === "eq" && call[1] === "pet_id" && call[2] === "milo",
    ),
  );
  assert.ok(
    calls.some(
      (call) => call[0] === "gte" && call[2] === "2026-11-01T05:00:00.000Z",
    ),
  );
  assert.ok(
    calls.some(
      (call) => call[0] === "lte" && call[2] === "2026-11-02T05:59:59.999Z",
    ),
  );
});

const { isScheduleDayComplete } = loadTS("utils/scheduleDayComplete.ts");
test("progress card celebrates all scheduled tasks, then returns to incomplete when one is unchecked", () => {
  const rows = [
    {
      pet_id: "milo",
      local_date: "2026-10-28",
      completed_at: "2026-10-28T14:00:00Z",
    },
    { pet_id: "milo", local_date: "2026-10-28", completed_at: null },
  ];
  assert.equal(isScheduleDayComplete(rows, "milo", "2026-10-28"), false);
  rows[1].completed_at = "2026-10-28T15:00:00Z";
  assert.equal(isScheduleDayComplete(rows, "milo", "2026-10-28"), true);
  rows[0].completed_at = null;
  assert.equal(isScheduleDayComplete(rows, "milo", "2026-10-28"), false);
});
test("an empty, loading, different pet, or different date schedule never produces a completed card", () => {
  assert.equal(isScheduleDayComplete(undefined, "milo", "2026-10-28"), false);
  assert.equal(isScheduleDayComplete([], "milo", "2026-10-28"), false);
  const rows = [
    {
      pet_id: "luna",
      local_date: "2026-10-27",
      completed_at: "2026-10-27T14:00:00Z",
    },
  ];
  assert.equal(isScheduleDayComplete(rows, "milo", "2026-10-28"), false);
  assert.equal(isScheduleDayComplete(rows, "luna", "2026-10-28"), false);
});
