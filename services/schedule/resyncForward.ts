/**
 * Rebuilding today through today+N after a profile change.
 *
 * Separate from plan.ts so that planning stays independent of reconciliation
 * scheduling; this module is the one place that needs both.
 */

import { queryClient } from "@/lib/query/client";
import { scheduleDayKey, schedulePetPrefixKey } from "@/lib/query/keys";
import { buildPlannedScheduleForDay } from "@/utils/buildSchedulePlan";
import { getLocalYmd } from "@/utils/localCalendarDate";
import {
  resolvePetDetailsForSchedule,
  resolveVetVisitsForSchedule,
  upsertPlannedItems,
} from "./plan";
import { fetchScheduleItemsForDay } from "./queries";
import { abortBackgroundReconciles, ensureScheduleForDay } from "./reconcile";

const FORWARD_SYNC_DAYS = 14;

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return getLocalYmd(dt);
}

/**
 * Rebuild today through today+N for a pet after profile changes.
 * Always loads a fresh profile, always writes each day (including today), and
 * seeds the React Query cache so the open Schedule tab updates immediately.
 * Never touches past dates.
 */
export async function resyncScheduleForward(petId: string): Promise<void> {
  /**
   * Cancel anything already reading the old plan before we fetch the new one,
   * so a stale writer cannot land after us.
   */
  abortBackgroundReconciles(petId);

  const today = getLocalYmd();
  const [details, visits] = await Promise.all([
    resolvePetDetailsForSchedule(petId, { fresh: true }),
    resolveVetVisitsForSchedule(petId, { fresh: true }),
  ]);
  if (!details) return;

  /**
   * Cancel in-flight day fetches so a stale ensureScheduleForDay cannot
   * overwrite the profile sync we're about to write (especially today).
   */
  abortBackgroundReconciles(petId);
  await queryClient.cancelQueries({ queryKey: schedulePetPrefixKey(petId) });

  for (let i = 0; i <= FORWARD_SYNC_DAYS; i++) {
    const localYmd = addDaysYmd(today, i);
    const existing = await fetchScheduleItemsForDay(petId, localYmd);
    const planned = buildPlannedScheduleForDay(details, localYmd, visits);
    await upsertPlannedItems(planned, existing);
    const next = await fetchScheduleItemsForDay(petId, localYmd);
    queryClient.setQueryData(scheduleDayKey(petId, localYmd), next);
  }
}
