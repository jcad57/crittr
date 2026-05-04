/**
 * Applies the clock from `picked` onto today's local calendar date.
 * Use for time-only pickers so the stored `Date` stays aligned with local "today".
 */
export function mergeWallClockOntoToday(picked: Date): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    picked.getHours(),
    picked.getMinutes(),
    picked.getSeconds(),
    0,
  );
}
