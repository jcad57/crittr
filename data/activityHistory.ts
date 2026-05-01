import { formatMedicationDosageDisplay } from "@/utils/medicationDosageDisplay";
import { resolveActivityLoggerLabel } from "@/utils/profileDisplay";
import type { PetActivity } from "@/types/database";

export type ActivityDisplayCategory =
  | "exercise"
  | "meals"
  | "treats"
  | "meds"
  | "vet_visit"
  | "training"
  | "potty"
  | "maintenance";

export type ActivityFilterCategory = "all" | ActivityDisplayCategory;

export type ActivityHistoryEntry = {
  id: string;
  category: ActivityDisplayCategory;
  title: string;
  loggedByLine: string;
  primaryStat: string;
  timeLabel: string;
  dateKey: string;
  timestamp: number;
  medDone?: boolean;
  hasNotes?: boolean;
};

export type WeeklyActivitySummary = {
  walks: number;
  walksDeltaVsLastWeek: number;
  meals: number;
  mealsDeltaVsLastWeek: number;
  treats: number;
  weeklyTreatLimit: number;
  maintenanceThisWeek: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function pottyBreakSummary(a: PetActivity): string {
  const pee = a.potty_pee === true;
  const poo = a.potty_poo === true;
  if (pee && poo) return "Pee & poo";
  if (pee) return "Pee";
  if (poo) return "Poo";
  return "";
}

export function displayCategory(a: PetActivity): ActivityDisplayCategory {
  switch (a.activity_type) {
    case "exercise":
      return "exercise";
    case "food":
      return a.is_treat ? "treats" : "meals";
    case "medication":
      return "meds";
    case "vet_visit":
      return "vet_visit";
    case "training":
      return "training";
    case "potty":
      return "potty";
    case "maintenance":
      return "maintenance";
  }
}

function buildPrimaryStat(a: PetActivity): string {
  switch (a.activity_type) {
    case "exercise": {
      const h = a.duration_hours ?? 0;
      const m = a.duration_minutes ?? 0;
      if (h > 0 && m > 0) return `${h}h ${m} min`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m} min`;
      return "";
    }
    case "food":
      return a.food_amount && a.food_unit
        ? `${a.food_amount} ${a.food_unit.toLowerCase()}`
        : "";
    case "medication":
      return formatMedicationDosageDisplay(a.med_amount, a.med_unit);
    case "vet_visit":
      return "";
    case "training": {
      const h = a.duration_hours ?? 0;
      const m = a.duration_minutes ?? 0;
      if (h > 0 && m > 0) return `${h}h ${m} min`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m} min`;
      return "";
    }
    case "potty":
      return pottyBreakSummary(a);
    case "maintenance": {
      const loc = a.location?.trim();
      return loc ?? "";
    }
  }
}

export function petActivityToHistoryEntry(
  a: PetActivity,
  nameByUserId: Map<string, string>,
  currentUserId: string | null | undefined,
): ActivityHistoryEntry {
  return {
    id: a.id,
    category: displayCategory(a),
    title: a.label,
    loggedByLine: resolveActivityLoggerLabel(
      a.logged_by,
      nameByUserId,
      currentUserId,
    ),
    primaryStat: buildPrimaryStat(a),
    timeLabel: formatTime(a.logged_at),
    dateKey: toDateKey(a.logged_at),
    timestamp: new Date(a.logged_at).getTime(),
    hasNotes: !!a.notes?.trim(),
  };
}

export function convertActivities(
  activities: PetActivity[],
  nameByUserId: Map<string, string>,
  currentUserId: string | null | undefined,
): ActivityHistoryEntry[] {
  return activities.map((a) =>
    petActivityToHistoryEntry(a, nameByUserId, currentUserId),
  );
}

function parseDateKey(dateKey: string): Date {
  const [yy, mm, dd] = dateKey.split("-").map((x) => parseInt(x, 10));
  return new Date(yy, mm - 1, dd);
}

export function formatActivitySectionTitle(
  dateKey: string,
  today: Date = new Date(),
): string {
  const d = parseDateKey(dateKey);
  const t0 = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((t0.getTime() - d0.getTime()) / 86400000);

  const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const dayNum = d.getDate();

  if (diffDays === 0) return `TODAY · ${month} ${dayNum}`;
  if (diffDays === 1) return `YESTERDAY · ${month} ${dayNum}`;

  const weekday = d.toLocaleString("en-US", { weekday: "long" }).toUpperCase();
  return `${weekday} · ${month} ${dayNum}`;
}

/** Filter history entries to a single calendar day (`YYYY-MM-DD`, local), or pass `null` for all days. */
export function filterEntriesByDateKey(
  entries: ActivityHistoryEntry[],
  dateKeyYmd: string | null,
): ActivityHistoryEntry[] {
  if (dateKeyYmd == null) return entries;
  return entries.filter((e) => e.dateKey === dateKeyYmd);
}

export function groupActivityHistory(
  entries: ActivityHistoryEntry[],
  filter: ActivityFilterCategory,
  newestFirst: boolean,
): { title: string; dateKey: string; data: ActivityHistoryEntry[] }[] {
  let list =
    filter === "all"
      ? entries
      : entries.filter((e) => e.category === filter);

  list = [...list].sort((a, b) =>
    newestFirst ? b.timestamp - a.timestamp : a.timestamp - b.timestamp,
  );

  const byDay = new Map<string, ActivityHistoryEntry[]>();
  for (const e of list) {
    const arr = byDay.get(e.dateKey) ?? [];
    arr.push(e);
    byDay.set(e.dateKey, arr);
  }

  const dayKeys = [...byDay.keys()].sort((a, b) =>
    newestFirst ? b.localeCompare(a) : a.localeCompare(b),
  );

  return dayKeys.map((dateKey) => {
    const dayEntries = byDay.get(dateKey) ?? [];
    const sortedDay = [...dayEntries].sort((a, b) =>
      newestFirst ? b.timestamp - a.timestamp : a.timestamp - b.timestamp,
    );
    return {
      title: formatActivitySectionTitle(dateKey),
      dateKey,
      data: sortedDay,
    };
  });
}

function getMonday(d: Date): Date {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = result.getDay();
  const diff = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - diff);
  return result;
}

export function computeWeeklySummary(
  activities: PetActivity[],
): WeeklyActivitySummary {
  const now = new Date();
  const thisMonday = getMonday(now);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  let thisWeekWalks = 0;
  let lastWeekWalks = 0;
  let thisWeekMeals = 0;
  let lastWeekMeals = 0;
  let thisWeekTreats = 0;
  let thisWeekMaintenance = 0;

  for (const a of activities) {
    const ts = new Date(a.logged_at);
    const isThisWeek = ts >= thisMonday;
    const isLastWeek = ts >= lastMonday && ts < thisMonday;

    if (a.activity_type === "exercise") {
      if (isThisWeek) thisWeekWalks++;
      if (isLastWeek) lastWeekWalks++;
    }
    if (a.activity_type === "food" && !a.is_treat) {
      if (isThisWeek) thisWeekMeals++;
      if (isLastWeek) lastWeekMeals++;
    }
    if (a.activity_type === "food" && a.is_treat && isThisWeek) {
      thisWeekTreats++;
    }
    if (a.activity_type === "maintenance" && isThisWeek) {
      thisWeekMaintenance++;
    }
  }

  const walksDelta = thisWeekWalks - lastWeekWalks;
  const mealsDelta = thisWeekMeals - lastWeekMeals;

  return {
    walks: thisWeekWalks,
    walksDeltaVsLastWeek: walksDelta,
    meals: thisWeekMeals,
    mealsDeltaVsLastWeek: mealsDelta,
    treats: thisWeekTreats,
    weeklyTreatLimit: 5,
    maintenanceThisWeek: thisWeekMaintenance,
  };
}
