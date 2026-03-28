import type { ActivityCategory } from "@/data/mockDashboard";

/** Full activity row for the Activity tab (grouped list + weekly stats). */
export type ActivityHistoryEntry = {
  id: string;
  category: ActivityCategory;
  title: string;
  detailLine: string;
  primaryStat: string;
  timeLabel: string;
  /** Local calendar day YYYY-MM-DD */
  dateKey: string;
  /** Sort key (UTC ms) */
  timestamp: number;
  /** Medication row: show green “Done” chip */
  medDone?: boolean;
};

export type ActivityFilterCategory = "all" | ActivityCategory;

export type WeeklyActivitySummary = {
  walks: number;
  /** Positive = more than prior week (shown with ↑) */
  walksDeltaVsLastWeek: number;
  meals: number;
  mealsFootnote: string;
  treats: number;
  /** Weekly treat allowance; over → coral nudge */
  weeklyTreatLimit: number;
};

/** Design-matched sample data — replace with API later. */
export const MOCK_WEEKLY_SUMMARY: WeeklyActivitySummary = {
  walks: 14,
  walksDeltaVsLastWeek: 2,
  meals: 27,
  mealsFootnote: "On track",
  treats: 8,
  weeklyTreatLimit: 5,
};

/** Slight variation per pet so the weekly strip reflects the active pet. */
export function mockWeeklySummaryForPet(petId: string): WeeklyActivitySummary {
  const h = [...petId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    walks: 8 + (h % 12),
    walksDeltaVsLastWeek: -3 + (h % 7),
    meals: 18 + (h % 14),
    mealsFootnote: h % 2 === 0 ? "On track" : "Slightly under",
    treats: 3 + (h % 8),
    weeklyTreatLimit: 5,
  };
}

/** Sample entries spanning “today” and “yesterday” (local dates). */
export function buildMockActivityHistory(
  petId: string,
  petName: string,
  now: Date = new Date(),
): ActivityHistoryEntry[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const mo = now.getMonth() + 1;
  const d = now.getDate();
  const todayKey = `${y}-${pad(mo)}-${pad(d)}`;
  const yest = new Date(y, mo - 1, d - 1);
  const yk = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

  const t = (h: number, m: number) => {
    const dt = new Date(y, mo - 1, d, h, m, 0, 0);
    return dt.getTime();
  };
  const yt = (h: number, m: number) => {
    const dt = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), h, m, 0, 0);
    return dt.getTime();
  };

  const p = petName.trim() || "Your pet";
  const id = (suffix: string) => `${petId}-${suffix}`;

  return [
    {
      id: id("h1"),
      category: "exercise",
      title: "Morning walk",
      detailLine: `${p} · 1.4 miles · Barton Creek Trail`,
      primaryStat: "32 min",
      timeLabel: "7:14 AM",
      dateKey: todayKey,
      timestamp: t(7, 14),
    },
    {
      id: id("h2"),
      category: "meals",
      title: "Breakfast",
      detailLine: `${p} · 1 cup dry kibble`,
      primaryStat: "1 cup",
      timeLabel: "7:30 AM",
      dateKey: todayKey,
      timestamp: t(7, 30),
    },
    {
      id: id("h3"),
      category: "treats",
      title: "Treat",
      detailLine: `${p} · training reward`,
      primaryStat: "1 treat",
      timeLabel: "9:02 AM",
      dateKey: todayKey,
      timestamp: t(9, 2),
    },
    {
      id: id("h4"),
      category: "meds",
      title: "Benadryl",
      detailLine: `${p} · 2 tablets · with meal`,
      primaryStat: "2 tablets",
      timeLabel: "7:35 AM",
      dateKey: todayKey,
      timestamp: t(7, 35),
      medDone: true,
    },
    {
      id: id("h5"),
      category: "exercise",
      title: "Evening stroll",
      detailLine: `${p} · neighborhood loop`,
      primaryStat: "18 min",
      timeLabel: "6:10 PM",
      dateKey: yk,
      timestamp: yt(18, 10),
    },
    {
      id: id("h6"),
      category: "meals",
      title: "Dinner",
      detailLine: `${p} · wet + dry mix`,
      primaryStat: "1½ cups",
      timeLabel: "5:45 PM",
      dateKey: yk,
      timestamp: yt(17, 45),
    },
  ];
}

function parseDateKey(dateKey: string): Date {
  const [yy, mm, dd] = dateKey.split("-").map((x) => parseInt(x, 10));
  return new Date(yy, mm - 1, dd);
}

/** Section header: TODAY · MAR 27 */
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
