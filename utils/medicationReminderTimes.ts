import type { PetMedication } from "@/types/database";

const HHMM_RE = /^(\d{1,2}):(\d{2})$/;

function isValidHHmm(s: string): boolean {
  const m = HHMM_RE.exec(s.trim());
  if (!m) return false;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/** Ordered list of HH:mm times for notifications and the edit form. */
export function getMedicationReminderTimes(med: PetMedication): string[] {
  const raw = med.reminder_times;
  if (Array.isArray(raw) && raw.length > 0) {
    const out = raw
      .filter((x): x is string => typeof x === "string" && isValidHHmm(x))
      .map((x) => x.trim());
    if (out.length > 0) return sortTimesAscUnique(out);
  }
  if (med.reminder_time?.trim() && isValidHHmm(med.reminder_time)) {
    return [med.reminder_time.trim()];
  }
  return [];
}

export function sortTimesAscUnique(times: string[]): string[] {
  const unique = [...new Set(times.map((t) => t.trim()).filter(Boolean))];
  unique.sort((a, b) => {
    const [ah, am] = a.split(":").map((x) => parseInt(x, 10));
    const [bh, bm] = b.split(":").map((x) => parseInt(x, 10));
    return ah * 60 + am - (bh * 60 + bm);
  });
  return unique;
}

/** Persist: first time in `reminder_time`; full list in `reminder_times` only if 2+. */
export function reminderFieldsForDb(sortedHHmm: string[]): {
  reminder_time: string | null;
  reminder_times: string[] | null;
} {
  if (sortedHHmm.length === 0) {
    return { reminder_time: null, reminder_times: null };
  }
  return {
    reminder_time: sortedHHmm[0]!,
    reminder_times: sortedHHmm.length > 1 ? sortedHHmm : null,
  };
}
