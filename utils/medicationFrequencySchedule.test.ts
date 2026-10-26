import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PetMedication } from "../types/database.ts";
import {
  computeNextDueDate,
  daysFromTodayTo,
  dosesOnDueDay,
  enumerateUpcomingMedicationDueDates,
  isLastGivenOccurrence,
  isMedicationDueOnLocalDate,
  resolveNextDueDate,
  toLocalYmd,
} from "./medicationDueSchedule.ts";

function ymd(d: Date): string {
  return toLocalYmd(d);
}

function daysAgo(now: Date, days: number): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  return ymd(d);
}

function stubMed(over: Partial<PetMedication>): PetMedication {
  return {
    id: "m1",
    pet_id: "p1",
    name: "Heartgard",
    dosage: "1 Tablet",
    frequency: over.frequency ?? "Monthly",
    condition: null,
    notes: null,
    doses_per_period: 1,
    dose_period: "month",
    interval_count: null,
    interval_unit: null,
    reminder_time: "08:00",
    reminder_times: null,
    last_given_on: null,
    next_due_date: null,
    created_at: "2026-08-01T12:00:00.000Z",
    ...over,
  };
}

function expectedDosesOn(med: PetMedication, localYmd: string): number {
  if (!isMedicationDueOnLocalDate(med, localYmd)) return 0;
  return dosesOnDueDay(med);
}

const NOW = new Date(2026, 7, 23, 12, 0, 0, 0);
const LAST_GIVEN = daysAgo(NOW, 3);

const CASES: {
  name: string;
  med: Partial<PetMedication>;
  nextDue: string;
  /** When overdue, reminder enumeration advances to the next future due day. */
  futureReminderDue?: string;
  extraDue?: string[];
  notDue: string[];
}[] = [
  {
    name: "every other day",
    med: {
      frequency: "Every other day",
      dose_period: "day",
      interval_count: 2,
      interval_unit: "day",
    },
    nextDue: ymd(new Date(2026, 7, 22)),
    futureReminderDue: ymd(new Date(2026, 7, 24)),
    extraDue: [LAST_GIVEN, ymd(new Date(2026, 7, 22))],
    notDue: [ymd(new Date(2026, 7, 21)), ymd(new Date(2026, 7, 23))],
  },
  {
    name: "weekly",
    med: {
      frequency: "Weekly",
      dose_period: "week",
      interval_count: null,
      interval_unit: null,
    },
    nextDue: ymd(new Date(2026, 7, 27)),
    extraDue: [LAST_GIVEN],
    notDue: [ymd(new Date(2026, 7, 21)), ymd(new Date(2026, 7, 23))],
  },
  {
    name: "every other week",
    med: {
      frequency: "Every other week",
      dose_period: "week",
      interval_count: 2,
      interval_unit: "week",
    },
    nextDue: ymd(new Date(2026, 8, 3)),
    extraDue: [LAST_GIVEN],
    notDue: [ymd(new Date(2026, 7, 27))],
  },
  {
    name: "monthly",
    med: {
      frequency: "Monthly",
      dose_period: "month",
      interval_count: null,
      interval_unit: null,
    },
    nextDue: ymd(new Date(2026, 8, 20)),
    extraDue: [LAST_GIVEN],
    notDue: [ymd(new Date(2026, 7, 23)), ymd(new Date(2026, 8, 19))],
  },
  {
    name: "every 2 months",
    med: {
      frequency: "Every 2 months",
      dose_period: "month",
      interval_count: 2,
      interval_unit: "month",
    },
    nextDue: ymd(new Date(2026, 9, 20)),
    extraDue: [LAST_GIVEN],
    notDue: [ymd(new Date(2026, 8, 20))],
  },
  {
    name: "every 3 months",
    med: {
      frequency: "Every 3 months",
      dose_period: "month",
      interval_count: 3,
      interval_unit: "month",
    },
    nextDue: ymd(new Date(2026, 10, 20)),
    extraDue: [LAST_GIVEN],
    notDue: [ymd(new Date(2026, 9, 20))],
  },
  {
    name: "every 4 months",
    med: {
      frequency: "Every 4 months",
      dose_period: "month",
      interval_count: 4,
      interval_unit: "month",
    },
    nextDue: ymd(new Date(2026, 11, 20)),
    extraDue: [LAST_GIVEN],
    notDue: [ymd(new Date(2026, 10, 20))],
  },
  {
    name: "annually",
    med: {
      frequency: "Annually",
      dose_period: "month",
      interval_count: 12,
      interval_unit: "month",
    },
    nextDue: ymd(new Date(2027, 7, 20)),
    extraDue: [LAST_GIVEN],
    notDue: [ymd(new Date(2026, 7, 23)), ymd(new Date(2027, 7, 19))],
  },
];

describe("interval medications use last given as the completed origin", () => {
  for (const c of CASES) {
    it(`${c.name}: last given is due, next due is one interval later, off days are empty`, () => {
      const med = stubMed({ ...c.med, last_given_on: LAST_GIVEN });
      assert.equal(
        isMedicationDueOnLocalDate(med, LAST_GIVEN),
        true,
        "last given should be a due day",
      );
      const next = computeNextDueDate(med, NOW);
      assert.ok(next, "next due should exist");
      assert.equal(ymd(next!), c.nextDue);

      const reminders = enumerateUpcomingMedicationDueDates(med, 6, NOW).map(
        ymd,
      );
      assert.equal(reminders[0], c.futureReminderDue ?? c.nextDue);
      assert.equal(reminders.includes(LAST_GIVEN), false);

      assert.equal(expectedDosesOn(med, LAST_GIVEN), 1);
      for (const extra of c.extraDue ?? []) {
        assert.equal(isMedicationDueOnLocalDate(med, extra), true, extra);
      }
      for (const off of c.notDue) {
        assert.equal(isMedicationDueOnLocalDate(med, off), false, off);
        assert.equal(expectedDosesOn(med, off), 0, off);
      }
    });
  }
});

describe("daily medications", () => {
  it("appear every day and do not use interval next-due", () => {
    const med = stubMed({
      frequency: "2 times daily",
      dose_period: "day",
      interval_count: null,
      interval_unit: null,
      last_given_on: LAST_GIVEN,
      doses_per_period: 2,
    });
    assert.equal(isMedicationDueOnLocalDate(med, LAST_GIVEN), true);
    assert.equal(isMedicationDueOnLocalDate(med, ymd(NOW)), true);
    assert.equal(computeNextDueDate(med, NOW), null);
    assert.deepEqual(enumerateUpcomingMedicationDueDates(med, 4, NOW), []);
    assert.equal(expectedDosesOn(med, ymd(NOW)), 2);
  });
});

describe("no last given", () => {
  it("uses created_at as the first due day for monthly meds", () => {
    const created = "2026-08-23T15:00:00.000Z";
    const med = stubMed({
      frequency: "Monthly",
      dose_period: "month",
      last_given_on: null,
      created_at: created,
    });
    const createdYmd = ymd(new Date(created));
    assert.equal(isMedicationDueOnLocalDate(med, createdYmd), true);
    const next = computeNextDueDate(med, NOW);
    assert.ok(next);
    assert.equal(ymd(next!), createdYmd);
  });
});

describe("every-other-day is not treated as daily", () => {
  it("does not expect a dose on off days even with dose_period day", () => {
    const med = stubMed({
      frequency: "Every other day",
      dose_period: "day",
      interval_count: 2,
      interval_unit: "day",
      last_given_on: LAST_GIVEN,
      doses_per_period: 2,
    });
    assert.equal(expectedDosesOn(med, LAST_GIVEN), 2);
    assert.equal(expectedDosesOn(med, ymd(new Date(2026, 7, 21))), 0);
  });
});

describe("last given and overdue next due", () => {
  const monthly = {
    frequency: "Monthly",
    dose_period: "month" as const,
    interval_count: null,
    interval_unit: null,
  };

  it("last given this month: next due is one interval later and not due today", () => {
    const lastGiven = "2026-08-08";
    const med = stubMed({ ...monthly, last_given_on: lastGiven });
    const next = resolveNextDueDate(med, NOW);
    assert.ok(next);
    assert.equal(ymd(next!), "2026-09-08");
    assert.ok(daysFromTodayTo(next!, NOW) > 0);
    assert.equal(expectedDosesOn(med, ymd(NOW)), 0);
  });

  it("last given today: satisfies today and next due is one interval later", () => {
    const lastGiven = ymd(NOW);
    const med = stubMed({ ...monthly, last_given_on: lastGiven });
    const next = resolveNextDueDate(med, NOW);
    assert.ok(next);
    assert.equal(ymd(next!), "2026-09-23");
    assert.ok(daysFromTodayTo(next!, NOW) > 0);
    assert.equal(isLastGivenOccurrence(med, lastGiven), true);
    assert.equal(isMedicationDueOnLocalDate(med, lastGiven), true);
    assert.equal(expectedDosesOn(med, lastGiven), 1);
  });

  it("overdue last given: next due stays on the missed date and shows due", () => {
    const med = stubMed({ ...monthly, last_given_on: "2026-03-21" });
    const next = resolveNextDueDate(med, NOW);
    assert.ok(next);
    assert.equal(ymd(next!), "2026-04-21");
    assert.ok(daysFromTodayTo(next!, NOW) < 0);
  });

  it("cleared last given uses created_at as first due and shows due when overdue", () => {
    const med = stubMed({
      ...monthly,
      last_given_on: null,
      created_at: "2026-03-01T12:00:00.000Z",
    });
    const next = resolveNextDueDate(med, NOW);
    assert.ok(next);
    assert.equal(ymd(next!), "2026-03-01");
    assert.ok(daysFromTodayTo(next!, NOW) < 0);
  });
});
