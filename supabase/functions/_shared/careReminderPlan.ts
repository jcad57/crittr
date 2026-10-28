import { buildPlannedScheduleForDay } from "../../../utils/buildSchedulePlan.ts";
import type { PetVetVisit, PetWithDetails } from "../../../types/database.ts";

export type CareReminderInput = {
  pet: PetWithDetails;
  time_zone: string | null;
  vet_visits: PetVetVisit[];
  version: string;
};
export type CareReminder = {
  local_date: string; source_kind: string; source_id: string; source_slot: string;
  reminder_key: string; scheduled_at: string; category: string;
  title: string; body: string; href: string;
};

function wallParts(date: Date, timeZone: string): number[] {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return ["year", "month", "day", "hour", "minute", "second"].map((key) => Number(parts.find((p) => p.type === key)?.value));
}
export function careLocalDate(date: Date, timeZone: string): string {
  const [y, m, d] = wallParts(date, timeZone);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Compatible DST resolution: first occurrence of a repeated time; gaps advance. */
export function careWallTimeToDate(ymd: string, time: string, timeZone: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  const candidates = [-36, -12, 0, 12, 36].map((hours) => {
    const sample = target + hours * 3600_000;
    const [y, mo, d, h, mi, s] = wallParts(new Date(sample), timeZone);
    const offset = Date.UTC(y, mo - 1, d, h, mi, s) - sample;
    const instant = target - offset;
    const [wy, wm, wd, wh, wmi] = wallParts(new Date(instant), timeZone);
    return { instant, delta: Date.UTC(wy, wm - 1, wd, wh, wmi) - target };
  });
  const exact = candidates.filter((c) => c.delta === 0).sort((a, b) => a.instant - b.instant);
  const forward = candidates.filter((c) => c.delta > 0).sort((a, b) => a.delta - b.delta);
  const match = exact[0] ?? forward[0];
  if (!match) throw new Error("Unable to resolve the pet's care time zone");
  return new Date(match.instant);
}

function shiftDate(ymd: string, days: number): string {
  const date = new Date(`${ymd}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The worker uses the app's actual schedule planner, with the owner's saved zone. */
export function buildDueCareReminders(input: CareReminderInput, now = new Date()): CareReminder[] {
  const { pet, time_zone: zone } = input;
  if (!zone || pet.is_archived || pet.is_memorialized) return [];
  const result: CareReminder[] = [];
  const nowMs = now.getTime();
  const accept = (reminder: CareReminder, createdAt?: string) => {
    const at = Date.parse(reminder.scheduled_at);
    if (at > nowMs || at <= nowMs - 3600_000 || (createdAt && at < Date.parse(createdAt))) return;
    result.push(reminder);
  };
  const today = careLocalDate(now, zone);
  for (const date of [shiftDate(today, -1), today]) {
    for (const item of buildPlannedScheduleForDay({ ...pet, care_time_zone: zone }, date, [])) {
      if (item.completed_at) continue;
      const food = item.activity_type === "food";
      const med = item.activity_type === "medication";
      const treat = item.source_kind === "food_treat";
      const source = med ? pet.medications.find((m) => m.id === item.source_id)
        : food ? pet.foods.find((f) => f.id === item.meta.food_id)
        : pet.exercise_plans.find((p) => p.id === item.source_id) ?? pet.exercise ?? pet;
      accept({
        local_date: date, source_kind: item.source_kind, source_id: item.source_id, source_slot: item.source_slot,
        reminder_key: "due", scheduled_at: careWallTimeToDate(date, item.scheduled_time, zone).toISOString(),
        category: food ? "notify_meals_treats" : med ? "notify_medications" : "notify_co_care_activities",
        title: med ? "Medication reminder" : food ? treat ? "Treat reminder" : "Meal reminder" : "Exercise reminder",
        body: `${pet.name}: it's time for ${item.label}${food && item.detail_line ? ` (${item.detail_line})` : ""}.`,
        href: `/(logged-in)/add-activity?petId=${pet.id}&type=${item.activity_type}`,
      }, source?.created_at);
    }
  }
  for (const visit of input.vet_visits) {
    for (const hours of [24, 1]) {
      accept({ local_date: careLocalDate(new Date(visit.visit_at), zone), source_kind: "vet_visit",
        source_id: visit.id, source_slot: "", reminder_key: `${hours}h`,
        scheduled_at: new Date(Date.parse(visit.visit_at) - hours * 3600_000).toISOString(), category: "notify_vet_visits",
        title: "Vet visit coming up", body: `${pet.name}: ${visit.title} in ${hours === 24 ? "24 hours" : "1 hour"}.`,
        href: `/(logged-in)/pet/${pet.id}/vet-visits/${visit.id}`,
      }, visit.created_at);
    }
  }
  for (const vaccine of pet.vaccinations) {
    if (!vaccine.expires_on || !/^\d{4}-\d{2}-\d{2}$/.test(vaccine.expires_on)) continue;
    for (const days of [7, 0]) {
      const date = shiftDate(vaccine.expires_on, -days);
      accept({ local_date: vaccine.expires_on, source_kind: "vaccination", source_id: vaccine.id, source_slot: "",
        reminder_key: `${days}d`, scheduled_at: careWallTimeToDate(date, "09:00", zone).toISOString(), category: "notify_vaccinations",
        title: "Vaccination reminder", body: `${pet.name}: ${vaccine.name} expires ${days ? "in one week" : "today"}. It's time to arrange a renewal with your vet.`,
        href: `/(logged-in)/pet/${pet.id}/vaccinations/${vaccine.id}`,
      }, vaccine.created_at);
    }
  }
  return result;
}
