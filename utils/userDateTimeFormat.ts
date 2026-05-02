import type { Profile } from "@/types/database";
import { parseReminderTimeHHmm } from "@/utils/medicationSchedule";

/** App-side mirrors for `profiles.time_display_format`. */
export type UserTimeDisplay = "12h" | "24h";

/** App-side mirrors for `profiles.date_display_format`. */
export type UserDateDisplay = "mdy" | "dmy";

export function timeDisplayFromProfile(
  profile: Pick<Profile, "time_display_format"> | null | undefined,
): UserTimeDisplay {
  return profile?.time_display_format === "24h" ? "24h" : "12h";
}

export function dateDisplayFromProfile(
  profile: Pick<Profile, "date_display_format"> | null | undefined,
): UserDateDisplay {
  return profile?.date_display_format === "dmy" ? "dmy" : "mdy";
}

export function dateLocaleFor(dateDisplay: UserDateDisplay): string {
  return dateDisplay === "dmy" ? "en-GB" : "en-US";
}

export function formatUserTime(d: Date, timeDisplay: UserTimeDisplay): string {
  if (Number.isNaN(d.getTime())) return "—";
  const locale = "en-US";
  if (timeDisplay === "24h") {
    return d.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Display-only label for persisted `HH:mm` medication reminder strings. */
export function formatReminderHHmmForDisplay(
  hhmm: string,
  timeDisplay: UserTimeDisplay,
): string {
  return formatUserTime(parseReminderTimeHHmm(hhmm), timeDisplay);
}

export function formatUserNumericDate(
  d: Date,
  dateDisplay: UserDateDisplay,
): string {
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(dateLocaleFor(dateDisplay), {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatUserShortMonthDay(
  d: Date,
  dateDisplay: UserDateDisplay,
): string {
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(dateLocaleFor(dateDisplay), {
    month: "short",
    day: "numeric",
  });
}

/** “Saturday, May 2” / “Saturday, 2 May” style (no year — dashboard greeting line). */
export function formatUserWeekdayLongMonthDay(
  d: Date,
  dateDisplay: UserDateDisplay,
): string {
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(dateLocaleFor(dateDisplay), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Long spelled-out date (pet DOB lines, “Updated …”). */
export function formatUserLongDate(
  d: Date,
  dateDisplay: UserDateDisplay,
): string {
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(dateLocaleFor(dateDisplay), {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** ISO calendar date assumed local noon when only YYYY-MM-DD is known (expiry UX). */
export function formatUserLongDateFromYmd(
  ymd: string | null | undefined,
  dateDisplay: UserDateDisplay,
): string {
  const raw = String(ymd ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return "";
  return formatUserLongDate(new Date(`${raw.slice(0, 10)}T12:00:00`), dateDisplay);
}

/** Activity screen header: “May 2026” vs localized month/year. */
export function formatUserMonthYear(d: Date, dateDisplay: UserDateDisplay): string {
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(dateLocaleFor(dateDisplay), {
    month: "long",
    year: "numeric",
  });
}

/** Single-line datetime used on activity detail (“Sat, May 2, 9:00 AM”). */
export function formatUserShortWeekdayMonthDayTime(
  d: Date,
  dateDisplay: UserDateDisplay,
  timeDisplay: UserTimeDisplay,
): string {
  if (Number.isNaN(d.getTime())) return "";
  const locale = dateLocaleFor(dateDisplay);
  return d.toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: timeDisplay === "12h",
  });
}

/** Vet visit picker summary: weekday + full date + clock (includes calendar year). */
export function formatUserMediumDateTimeWithYear(
  d: Date,
  dateDisplay: UserDateDisplay,
  timeDisplay: UserTimeDisplay,
): string {
  if (Number.isNaN(d.getTime())) return "";
  const locale = dateLocaleFor(dateDisplay);
  return d.toLocaleString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: timeDisplay === "12h",
  });
}
