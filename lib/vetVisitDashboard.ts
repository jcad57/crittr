import { Colors } from "@/constants/colors";
import type { VetVisit } from "@/data/mockDashboard";
import type { PetVetVisit } from "@/types/database";

/** True when the visit is today or in the future (local calendar). */
export function isUpcomingVetVisit(iso: string): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return t >= start.getTime();
}

export function mapPetVetVisitToDashboard(row: PetVetVisit): VetVisit {
  const d = new Date(row.visit_at);
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const subtitle = buildVisitSubtitle(row);
  return {
    id: row.id,
    title: row.title,
    date: dateStr,
    time: timeStr,
    accentColor: Colors.lavenderDark,
    subtitle: subtitle || undefined,
    badgeLabel: d.toLocaleDateString("en-US", { month: "short" }),
  };
}

function buildVisitSubtitle(row: PetVetVisit): string | undefined {
  const loc = row.location?.trim();
  const notes = row.notes?.trim();
  if (loc && notes) return `${loc} · ${notes}`;
  return loc || notes || undefined;
}
