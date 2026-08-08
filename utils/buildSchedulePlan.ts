import type {
  PetMedication,
  PetVetVisit,
  PetWithDetails,
  PlannedScheduleItem,
} from "@/types/database";
import { getLocalYmd } from "@/utils/localCalendarDate";
import {
  dueSoonScheduleKind,
  enumerateUpcomingMedicationDueDates,
  medicationScheduleAnchor,
  advanceMedicationDueDate,
  startOfDay,
} from "@/utils/medicationDueSchedule";
import { getMedicationReminderTimes } from "@/utils/medicationReminderTimes";
import {
  dailyProgressFoodTarget,
  isTreatFood,
  portionsForPetFood,
} from "@/utils/petFood";
import { exercisePlansForLocalDate } from "@/utils/exercisePlans";
import {
  parseScheduleTime,
  periodForHourMinute,
  toPgTime,
} from "@/utils/schedulePeriods";

const LEGACY_FEED_HOURS = [8, 12, 18, 7, 13, 19, 9, 17];
const DEFAULT_WALK_HOURS = [8, 12, 17, 19, 9, 15, 18, 20];

function parseYmdToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function ymdEqualsDate(ymd: string, d: Date): boolean {
  return getLocalYmd(d) === ymd;
}

/** Expected doses on a specific local day (daily heuristics + interval due check). */
export function getExpectedDosesForLocalDate(
  m: PetMedication,
  localYmd: string,
): number {
  const period = m.dose_period ?? null;
  const n = m.doses_per_period ?? null;

  if (period === "day" && n != null && n > 0) {
    return Math.min(8, Math.max(1, Math.floor(n)));
  }

  const kind = dueSoonScheduleKind(m);
  if (kind !== "daily") {
    return isMedicationDueOnLocalDate(m, localYmd) ? 1 : 0;
  }

  const f = (m.frequency ?? "").toLowerCase();
  if (
    f.includes("twice") ||
    f.includes("2x") ||
    f.includes(" bid") ||
    f.includes("bid ") ||
    f === "bid" ||
    f.includes("12 hour") ||
    f.includes("every 12")
  ) {
    return 2;
  }
  if (
    f.includes("three") ||
    f.includes("3x") ||
    f.includes("tid") ||
    f.includes("3 times")
  ) {
    return 3;
  }
  if (
    f.includes("four") ||
    f.includes("4x") ||
    f.includes("qid") ||
    f.includes("4 times")
  ) {
    return 4;
  }
  return 1;
}

/**
 * Whether a medication should appear on `localYmd` (daily always; interval on due days).
 */
export function isMedicationDueOnLocalDate(
  m: PetMedication,
  localYmd: string,
): boolean {
  if (dueSoonScheduleKind(m) === "daily") {
    return true;
  }

  const target = startOfDay(parseYmdToLocalDate(localYmd));
  const today = startOfDay(new Date());

  if (target.getTime() >= today.getTime()) {
    const upcoming = enumerateUpcomingMedicationDueDates(m, 120);
    return upcoming.some((d) => ymdEqualsDate(localYmd, d));
  }

  // Past: walk forward from first due after anchor until we pass the target day.
  const kind = dueSoonScheduleKind(m);
  if (kind === "daily") return true;

  let cur = startOfDay(medicationScheduleAnchor(m));
  const stepFrom = (from: Date) => {
    const next = advanceMedicationDueDate(m, from);
    return next ? startOfDay(next) : null;
  };

  // Interval schedules treat the first due as one step after anchor.
  let due = stepFrom(cur);
  if (!due) {
    const raw = m.next_due_date?.trim();
    if (!raw) return false;
    due = startOfDay(parseYmdToLocalDate(raw.slice(0, 10)));
  }

  let guard = 0;
  while (due && due.getTime() < target.getTime() && guard < 500) {
    const next = stepFrom(due);
    if (!next || next.getTime() <= due.getTime()) break;
    due = next;
    guard += 1;
  }
  return due != null && due.getTime() === target.getTime();
}

function mealLabelForIndex(index: number, total: number): string {
  if (total === 1) return "Meal";
  if (index === 0) return "Breakfast";
  if (index === 1 && total === 2) return "Dinner";
  if (index === 1) return "Lunch";
  if (index === 2) return "Dinner";
  return `Meal ${index + 1}`;
}

function mealLabelForTime(hour: number, minute: number, index: number): string {
  const period = periodForHourMinute(hour, minute);
  if (period === "morning") return index === 0 ? "Breakfast" : "Morning meal";
  if (period === "afternoon") return "Lunch";
  return "Dinner";
}

function quantityFromPortion(
  size: string | null | undefined,
  unit: string | null | undefined,
): string | null {
  const s = size?.trim() ?? "";
  const u = unit?.trim() ?? "";
  const line = [s, u].filter(Boolean).join(" ");
  return line || null;
}

function defaultReminderTimesForDoseCount(count: number): string[] {
  const n = Math.min(8, Math.max(1, count));
  if (n === 1) return ["08:00"];
  if (n === 2) return ["08:00", "20:00"];
  if (n === 3) return ["08:00", "14:00", "20:00"];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const hour = Math.min(22, 7 + Math.round((i * 14) / Math.max(1, n - 1)));
    out.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return out;
}

function parseDosageParts(
  dosage: string | null,
): { amount: string; unit: string } | null {
  const raw = dosage?.trim() ?? "";
  if (!raw) return null;
  const m = /^([\d.]+)\s*(.*)$/.exec(raw);
  if (!m) return { amount: "", unit: raw };
  return { amount: m[1] ?? "", unit: (m[2] ?? "").trim() };
}

/**
 * Build the planned schedule for one local day from the live pet profile + visits.
 */
export function buildPlannedScheduleForDay(
  details: PetWithDetails,
  localYmd: string,
  vetVisits: PetVetVisit[],
): PlannedScheduleItem[] {
  const petId = details.id;
  const items: PlannedScheduleItem[] = [];

  // ── Meals (portions with feed_time) ──────────────────────────────────────
  const mealFoods = details.foods.filter((f) => !isTreatFood(f));
  type MealSlot = {
    foodId: string;
    brand: string;
    portionId: string | null;
    slot: string;
    hour: number;
    minute: number;
    size: string | null;
    unit: string | null;
    notes: string | null;
  };
  const mealSlots: MealSlot[] = [];

  for (const food of mealFoods) {
    const portions = portionsForPetFood(food);
    if (portions.length > 0) {
      for (const p of portions) {
        const { hour, minute } = parseScheduleTime(p.feed_time);
        mealSlots.push({
          foodId: food.id,
          brand: food.brand,
          portionId: p.id,
          slot: p.id,
          hour,
          minute,
          size: p.portion_size,
          unit: p.portion_unit,
          notes: food.notes ?? null,
        });
      }
    } else {
      const n = dailyProgressFoodTarget(food);
      for (let i = 0; i < n; i++) {
        const hour = LEGACY_FEED_HOURS[i] ?? 8 + i * 2;
        mealSlots.push({
          foodId: food.id,
          brand: food.brand,
          portionId: null,
          slot: String(i),
          hour,
          minute: 0,
          size: food.portion_size,
          unit: food.portion_unit,
          notes: food.notes ?? null,
        });
      }
    }
  }

  mealSlots.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  mealSlots.forEach((slot, index) => {
    const label =
      mealSlots.length <= 3
        ? mealLabelForIndex(index, mealSlots.length)
        : mealLabelForTime(slot.hour, slot.minute, index);
    items.push({
      pet_id: petId,
      local_date: localYmd,
      scheduled_time: toPgTime(slot.hour, slot.minute),
      activity_type: "food",
      source_kind: "food_portion",
      source_id: slot.portionId ?? slot.foodId,
      source_slot: slot.portionId ? "" : slot.slot,
      label,
      detail_line: slot.brand.trim() || null,
      quantity_line: quantityFromPortion(slot.size, slot.unit),
      notes: slot.notes?.trim() || null,
      meta: {
        food_id: slot.foodId,
        is_treat: false,
        portion_size: slot.size,
        portion_unit: slot.unit,
      },
    });
  });

  // ── Treats (same portion model as meals; keep food_treat source_kind) ────
  type TreatSlot = {
    foodId: string;
    brand: string;
    portionId: string | null;
    slot: string;
    hour: number;
    minute: number;
    size: string | null;
    unit: string | null;
    notes: string | null;
  };
  const treatSlots: TreatSlot[] = [];

  for (const food of details.foods.filter((f) => isTreatFood(f))) {
    const portions = portionsForPetFood(food);
    if (portions.length > 0) {
      for (const p of portions) {
        const { hour, minute } = parseScheduleTime(p.feed_time);
        treatSlots.push({
          foodId: food.id,
          brand: food.brand,
          portionId: p.id,
          slot: p.id,
          hour,
          minute,
          size: p.portion_size,
          unit: p.portion_unit,
          notes: food.notes ?? null,
        });
      }
    } else {
      const n = dailyProgressFoodTarget(food);
      for (let i = 0; i < n; i++) {
        const hour =
          LEGACY_FEED_HOURS[Math.min(i + 1, LEGACY_FEED_HOURS.length - 1)] ??
          10;
        treatSlots.push({
          foodId: food.id,
          brand: food.brand,
          portionId: null,
          slot: String(i),
          hour,
          minute: 0,
          size: food.portion_size,
          unit: food.portion_unit,
          notes: food.notes ?? null,
        });
      }
    }
  }

  treatSlots.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  for (const slot of treatSlots) {
    items.push({
      pet_id: petId,
      local_date: localYmd,
      scheduled_time: toPgTime(slot.hour, slot.minute),
      activity_type: "food",
      source_kind: "food_treat",
      source_id: slot.portionId ?? slot.foodId,
      source_slot: slot.portionId ? "" : slot.slot,
      label: "Treat",
      detail_line: slot.brand.trim() || null,
      quantity_line: quantityFromPortion(slot.size, slot.unit),
      notes: slot.notes?.trim() || null,
      meta: {
        food_id: slot.foodId,
        is_treat: true,
        portion_size: slot.size,
        portion_unit: slot.unit,
      },
    });
  }

  // ── Medications ──────────────────────────────────────────────────────────
  for (const med of details.medications) {
    if (!isMedicationDueOnLocalDate(med, localYmd)) continue;
    const expected = getExpectedDosesForLocalDate(med, localYmd);
    if (expected <= 0) continue;

    let times = getMedicationReminderTimes(med);
    if (times.length === 0) {
      times = defaultReminderTimesForDoseCount(expected);
    }
    // If reminder count < expected doses, pad; if more, trim to expected.
    if (times.length < expected) {
      const pad = defaultReminderTimesForDoseCount(expected);
      for (const t of pad) {
        if (times.length >= expected) break;
        if (!times.includes(t)) times.push(t);
      }
      times = times.slice(0, expected);
    } else if (times.length > expected) {
      times = times.slice(0, expected);
    }

    const dosageParts = parseDosageParts(med.dosage);
    const dosageLine =
      quantityFromPortion(
        dosageParts?.amount || null,
        dosageParts?.unit || null,
      ) || med.dosage?.trim() || null;
    for (const hhmm of times) {
      const { hour, minute } = parseScheduleTime(hhmm);
      items.push({
        pet_id: petId,
        local_date: localYmd,
        scheduled_time: toPgTime(hour, minute),
        activity_type: "medication",
        source_kind: "medication",
        source_id: med.id,
        source_slot: hhmm,
        label: med.name.trim() || "Medication",
        detail_line: dosageLine,
        quantity_line: med.notes?.trim() || null,
        notes: null,
        meta: {
          medication_id: med.id,
          dosage: med.dosage,
          amount: dosageParts?.amount ?? "",
          unit: dosageParts?.unit ?? "",
        },
      });
    }
  }

  // ── Exercise / walks ─────────────────────────────────────────────────────
  const plans = details.exercise_plans ?? [];
  if (plans.length > 0) {
    for (const plan of exercisePlansForLocalDate(plans, localYmd)) {
      const { hour, minute } = parseScheduleTime(plan.scheduled_time);
      items.push({
        pet_id: petId,
        local_date: localYmd,
        scheduled_time: toPgTime(hour, minute),
        activity_type: "exercise",
        source_kind: "exercise",
        source_id: plan.id,
        source_slot: "",
        label: plan.label.trim() || (details.pet_type === "cat" ? "Playtime" : "Walk"),
        detail_line: "Home",
        quantity_line: null,
        notes: plan.notes?.trim() || null,
        meta: {
          exercise_type: plan.label.trim() || "Walk",
          exercise_plan_id: plan.id,
        },
      });
    }
  } else {
    // Legacy fallback: exercises_per_day / pet_exercises without plans
    const walkCount = Math.min(
      8,
      Math.max(
        0,
        details.exercises_per_day ?? details.exercise?.walks_per_day ?? 0,
      ),
    );
    const activityNames = details.exercise?.activities ?? [];
    const walkMinutes = details.exercise?.walk_duration_minutes ?? null;
    for (let i = 0; i < walkCount; i++) {
      const hour = DEFAULT_WALK_HOURS[i] ?? 8 + i * 2;
      const name =
        (activityNames[i] ?? activityNames[0] ?? "").trim() ||
        (details.pet_type === "cat" ? "Playtime" : "Walk");
      items.push({
        pet_id: petId,
        local_date: localYmd,
        scheduled_time: toPgTime(hour, 0),
        activity_type: "exercise",
        source_kind: "exercise",
        source_id: details.exercise?.id ?? petId,
        source_slot: String(i),
        label: name,
        detail_line: "Home",
        quantity_line:
          walkMinutes != null && walkMinutes > 0 ? `${walkMinutes} min` : null,
        notes: null,
        meta: {
          exercise_type: name,
          duration_minutes: walkMinutes,
        },
      });
    }
  }

  // ── Vet visits on this local day ─────────────────────────────────────────
  for (const visit of vetVisits) {
    const visitDate = new Date(visit.visit_at);
    if (getLocalYmd(visitDate) !== localYmd) continue;
    const hour = visitDate.getHours();
    const minute = visitDate.getMinutes();
    items.push({
      pet_id: petId,
      local_date: localYmd,
      scheduled_time: toPgTime(hour, minute),
      activity_type: "vet_visit",
      source_kind: "vet_visit",
      source_id: visit.id,
      source_slot: "",
      label: visit.title.trim() || "Vet visit",
      detail_line: visit.location?.trim() || null,
      quantity_line: null,
      notes: visit.notes?.trim() || null,
      meta: {
        vet_visit_id: visit.id,
        visit_at: visit.visit_at,
      },
    });
  }

  items.sort(
    (a, b) =>
      parseScheduleTime(a.scheduled_time).hour * 60 +
      parseScheduleTime(a.scheduled_time).minute -
      (parseScheduleTime(b.scheduled_time).hour * 60 +
        parseScheduleTime(b.scheduled_time).minute),
  );

  return items;
}
