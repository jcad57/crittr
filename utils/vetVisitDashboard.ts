import { Colors } from "@/constants/colors";
import type { VetVisitSummary } from "@/types/ui";
import type { PetVetVisit } from "@/types/database";
import type { UserDateDisplay, UserTimeDisplay } from "@/utils/userDateTimeFormat";
import { dateLocaleFor, formatUserTime } from "@/utils/userDateTimeFormat";

/** True when the visit is today or in the future (local calendar). */
export function isUpcomingVetVisit(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return t >= start.getTime();
}

export function mapPetVetVisitToDashboard(
  row: PetVetVisit,
  timeDisplay: UserTimeDisplay,
  dateDisplay: UserDateDisplay,
): VetVisitSummary {
  const d = new Date(row.visit_at);
  const locale = dateLocaleFor(dateDisplay);
  const dateStr = d.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = formatUserTime(d, timeDisplay);
  const subtitle = buildVisitSubtitle(row);
  return {
    id: row.id,
    title: row.title,
    date: dateStr,
    time: timeStr,
    accentColor: Colors.lavenderDark,
    subtitle: subtitle || undefined,
    badgeLabel: d.toLocaleDateString(locale, { month: "short" }),
  };
}

function buildVisitSubtitle(row: PetVetVisit): string | undefined {
  const loc = row.location?.trim();
  const notes = row.notes?.trim();
  if (loc && notes) return `${loc} · ${notes}`;
  return loc || notes || undefined;
}
