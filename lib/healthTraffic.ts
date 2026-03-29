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

/** Traffic-light status for medications (badges + banner). */
export function medicationTraffic(
  m: PetMedication,
): { kind: HealthTrafficKind; label: string } {
  const raw = m.next_due_date?.trim();
  if (raw) {
    const due = parseYmd(raw);
    const diff = daysFromToday(due);
    if (diff < 0) return { kind: "due_today", label: "Due today" };
    if (diff === 0) return { kind: "due_today", label: "Due today" };
    if (diff <= 7) return { kind: "due_soon", label: `Due ${fmtShort(due)}` };
    return { kind: "current", label: `Due ${fmtShort(due)}` };
  }

  const f = (m.frequency ?? "").toLowerCase();
  if (f.includes("daily"))
    return { kind: "due_today", label: "Due today" };
  if (
    f.includes("week") ||
    f.includes("month") ||
    f.includes("custom") ||
    f.includes("quarter")
  ) {
    return { kind: "due_soon", label: "Due soon" };
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
