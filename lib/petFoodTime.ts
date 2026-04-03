/** Convert a Date's local time to Postgres `time` string `HH:MM:SS`. */
export function dateToPgTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Parse `HH:MM:SS` or `HH:MM` from DB into a Date (today's calendar date, local). */
export function pgTimeToDate(feedTime: string): Date {
  const parts = feedTime.trim().split(":");
  const hh = parseInt(parts[0] ?? "8", 10) || 0;
  const mm = parseInt(parts[1] ?? "0", 10) || 0;
  const ss = parseInt(parts[2] ?? "0", 10) || 0;
  const d = new Date();
  d.setHours(hh, mm, ss, 0);
  return d;
}

/** Short label for UI lists, e.g. "8:00 AM". */
export function formatFeedTimeLabel(feedTime: string): string {
  return pgTimeToDate(feedTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
