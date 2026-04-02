import type { DailyProgressCategory } from "@/types/ui";

/** True when every category with a non-zero goal has met its target (zeros = N/A). */
export function isDailyProgressComplete(
  categories: DailyProgressCategory[],
): boolean {
  if (!categories.length) return false;
  const hasGoal = categories.some((c) => c.total > 0);
  if (!hasGoal) return false;
  return categories.every(
    (c) => c.total === 0 || c.current >= c.total,
  );
}
