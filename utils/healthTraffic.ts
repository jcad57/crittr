import {
  daysFromTodayTo,
  dueSoonScheduleKind,
  dueSoonWindowForKind,
  resolveNextDueDate,
} from "@/utils/medicationDueSchedule";
import type { PetMedication, PetVaccination } from "@/types/database";

export type HealthTrafficKind = "due_today" | "due_soon" | "current";

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("T")[0].split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysFromToday(target: Date): number {
  const t = startOfDay(new Date()).getTime();
  const x = startOfDay(target).getTime();
  return Math.round((x - t) / 86400000);
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Traffic-light status for medications (badges + banner).
 * Next due is derived from `last_given_on` (or `created_at`) + schedule when possible;
 * otherwise `next_due_date`. "Due soon" uses a 3-day horizon for weekly-like schedules
 * and 7 days for monthly-like (including custom every-N-months).
 */
export function medicationTraffic(
  m: PetMedication,
): { kind: HealthTrafficKind; label: string } {
  const scheduleKind = dueSoonScheduleKind(m);

  if (scheduleKind === "daily") {
    return { kind: "due_today", label: "Due today" };
  }

  const nextDue = resolveNextDueDate(m);
  if (nextDue != null) {
    const diff = daysFromTodayTo(nextDue);
    const window = dueSoonWindowForKind(scheduleKind);

    if (diff <= 0) {
      return { kind: "due_today", label: "Due today" };
    }
    if (diff <= window) {
      return { kind: "due_soon", label: `Due ${fmtShort(nextDue)}` };
    }
    return { kind: "current", label: `Due ${fmtShort(nextDue)}` };
  }

  const f = (m.frequency ?? "").toLowerCase();
  if (f.includes("daily")) {
    return { kind: "due_today", label: "Due today" };
  }
  return { kind: "current", label: "Up to date" };
}

/** Traffic-light status for vaccinations from expiry date. */
export function vaccinationTraffic(
  v: PetVaccination,
): { kind: HealthTrafficKind; label: string } {
  const raw = v.expires_on?.trim();
  if (!raw) return { kind: "current", label: "Current" };

  const exp = parseYmd(raw);
  const diff = daysFromToday(exp);
  if (diff < 0) return { kind: "due_today", label: "Overdue" };
  if (diff <= 60) return { kind: "due_soon", label: "Exp. soon" };
  return { kind: "current", label: "Current" };
}

/** True when the shot is on file with an expiry date that is overdue or within 60 days. */
export function vaccinationNeedsAttention(v: PetVaccination): boolean {
  const raw = v.expires_on?.trim();
  if (!raw) return false;
  return vaccinationTraffic(v).kind !== "current";
}

export function isMedicationDueToday(m: PetMedication): boolean {
  return medicationTraffic(m).kind === "due_today";
}
