const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const { activityTypeFromParam, pendingScheduleMatches, canMatchSchedule } =
  loadTS("utils/activityEntry.ts");

test("sheet entry accepts each supported type and preserves direct weigh-in links", () => {
  for (const type of [
    "exercise",
    "food",
    "medication",
    "training",
    "potty",
    "maintenance",
    "weigh_in",
  ]) {
    assert.equal(activityTypeFromParam(type), type);
  }
  assert.equal(activityTypeFromParam(["food", "exercise"]), "food");
  for (const value of [undefined, "", "vet_visit", "unknown", "../settings"]) {
    assert.equal(activityTypeFromParam(value), null);
  }
});

test("sheet entry retains the original unfinished schedule-match choices", () => {
  const breakfast = {
    id: "breakfast",
    activity_type: "food",
    completed_at: "2026-10-28T14:00:00Z",
  };
  const dinner = { id: "dinner", activity_type: "food", completed_at: null };
  const walk = { id: "walk", activity_type: "exercise", completed_at: null };
  const items = [breakfast, dinner, walk];
  assert.deepEqual(pendingScheduleMatches("food", items), [dinner]);
  assert.deepEqual(pendingScheduleMatches("exercise", items), [walk]);
  assert.equal(items.length, 3);
});

test("unscheduled activity types skip the task-match prompt without blocking their forms", () => {
  for (const type of ["training", "maintenance", "weigh_in"]) {
    assert.equal(canMatchSchedule(type), false);
    assert.equal(
      pendingScheduleMatches(type, [
        { id: type, activity_type: type, completed_at: null },
      ]).length,
      0,
    );
  }
  assert.equal(pendingScheduleMatches("food", undefined).length, 0);
});
