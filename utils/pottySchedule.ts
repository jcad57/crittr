/** Canonical, distinct daily wall-clock times. Seconds are intentionally omitted from the UI. */
export function normalizePottyTimes(times: readonly string[]): string[] {
  return [...new Set(times.map((time) => {
    const match = /^(\d{1,2}):(\d{2})(?::00)?$/.exec(time.trim());
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) throw new Error("Choose a valid potty time.");
    return `${match[1].padStart(2, "0")}:${match[2]}:00`;
  }))].sort();
}
