const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
process.env.TZ = "America/Chicago";
const calendar = loadTS("utils/localCalendarDate.ts");
const dueSchedule = loadTS("utils/medicationDueSchedule.ts");
const times = loadTS("utils/medicationReminderTimes.ts");
const foodUtils = loadTS("utils/petFood.ts", { "@/utils/petFoodTime": {} });
const exerciseUtils = loadTS("utils/exercisePlans.ts", {
  "@/utils/localCalendarDate": calendar, "@/utils/userDateTimeFormat": {},
});
const schedulePlan = loadTS("utils/buildSchedulePlan.ts", {
  "@/utils/localCalendarDate": calendar, "@/utils/medicationDueSchedule": dueSchedule,
  "@/utils/medicationReminderTimes": times, "@/utils/petFood": foodUtils,
  "@/utils/medicationDosageDraft": { dosagePartsForReminderTime: () => ({ amount: "1", unit: "Tablet" }) },
  "@/utils/exercisePlans": exerciseUtils,
  "@/utils/schedulePeriods": loadTS("utils/schedulePeriods.ts"),
});
const pet = (fields = {}) => ({ id: "pet", name: "Pet", foods: [], medications: [], vaccinations: [], exercise_plans: [], ...fields });
const food = (id = "food", feedTimes = ["08:00"], treat = false) => ({
  id, brand: id, is_treat: treat, meals_per_day: feedTimes.length,
  pet_food_portions: feedTimes.map((feed_time, i) => ({ id: `${id}-${i}`, feed_time, sort_order: i })),
});
const medication = (fields = {}) => ({ id: "med", name: "Care", dose_period: "day", doses_per_period: 1,
  reminder_time: "08:00", created_at: "2026-01-01T12:00:00Z", ...fields });

module.exports = { calendar, schedulePlan, pet, food, medication };
