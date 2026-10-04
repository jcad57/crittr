/** Meaningful monthly activity-logging milestones (not a badge/streak system). */
export const ACTIVITY_MILESTONES = [10, 25, 50, 100, 200, 350, 500] as const;

const POST_500_STEP = 250;

/**
 * Highest milestone at or below `count`. Returns null below the first milestone.
 */
export function highestMilestoneReached(count: number): number | null {
  if (!Number.isFinite(count) || count < ACTIVITY_MILESTONES[0]) return null;

  let reached: number | null = null;
  for (const m of ACTIVITY_MILESTONES) {
    if (count >= m) reached = m;
    else break;
  }

  if (count >= 500) {
    const extra =
      500 + Math.floor((count - 500) / POST_500_STEP) * POST_500_STEP;
    if (extra > (reached ?? 0)) reached = extra;
  }

  return reached;
}

/**
 * The single most meaningful *new* milestone for this count.
 * Lower uncelebrated milestones are skipped once a higher one has been shown.
 */
export function pickUncelebratedMilestone(
  count: number,
  celebrated: readonly number[],
): number | null {
  const maxCelebrated =
    celebrated.length > 0 ? Math.max(...celebrated) : 0;

  const candidates: number[] = [];
  for (const m of ACTIVITY_MILESTONES) {
    if (count >= m && m > maxCelebrated) candidates.push(m);
  }

  if (count >= 500) {
    const extra =
      500 + Math.floor((count - 500) / POST_500_STEP) * POST_500_STEP;
    for (let m = 500; m <= extra; m += POST_500_STEP) {
      if (m > maxCelebrated && !candidates.includes(m)) {
        candidates.push(m);
      }
    }
  }

  if (candidates.length === 0) return null;
  return candidates[candidates.length - 1] ?? null;
}

export function startOfLocalMonthIso(now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
}

export function localMonthKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
