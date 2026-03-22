// ─── Locale-aware time formatting ─────────────────────────────────────────────

export function detectUse12Hour(): boolean {
  const sample = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(
    new Date(2000, 0, 1, 13),
  );
  return /[ap]m/i.test(sample);
}

export function formatHour(hour: number, use12h: boolean): string {
  if (use12h) {
    if (hour === 0) return "12 am";
    if (hour === 12) return "12 pm";
    return hour < 12 ? `${hour} am` : `${hour - 12} pm`;
  }
  return `${hour.toString().padStart(2, "0")}:00`;
}
