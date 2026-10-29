import { SEASON_TRANSITIONS } from "../constants/seasonTransitions";
import { SOUTHERN_TIME_ZONES } from "../constants/southernTimeZones";
import type { Season } from "../theme/seasonalThemes";

export type Hemisphere = "north" | "south";
const NORTHERN_SEASONS: readonly Season[] = ["spring", "summer", "fall", "winter"];

export function hemisphereForTimeZone(timeZone: string): Hemisphere {
  // Prefixes also cover newly introduced cities and legacy aliases in these regions.
  if (timeZone.startsWith("Australia/") || timeZone.startsWith("Antarctica/") || SOUTHERN_TIME_ZONES.has(timeZone)) return "south";
  try {
    const canonical = new Intl.DateTimeFormat("en", { timeZone }).resolvedOptions().timeZone;
    if (SOUTHERN_TIME_ZONES.has(canonical)) return "south";
  } catch { /* Unknown timezone / UTC follows the northern calendar. */ }
  return "north";
}

export function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}

/** Uses the real UTC event instant, so its date/time is correct in every timezone. */
export function seasonAt(now: Date, hemisphere: Hemisphere): Season {
  const transitions = SEASON_TRANSITIONS[now.getUTCFullYear()];
  if (!transitions || !Number.isFinite(now.getTime())) return "summer";
  let index = 3; // January belongs to the preceding December's season.
  transitions.forEach((iso, i) => { if (now.getTime() >= Date.parse(iso)) index = i; });
  return NORTHERN_SEASONS[(index + (hemisphere === "south" ? 2 : 0)) % 4];
}

export function nextSeasonTransition(now: Date): number | null {
  const year = now.getUTCFullYear();
  const events = [...(SEASON_TRANSITIONS[year] ?? []), ...(SEASON_TRANSITIONS[year + 1] ?? [])];
  return events.map(Date.parse).find((time) => time > now.getTime()) ?? null;
}
