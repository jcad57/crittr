/** Pulling upcoming pet-days into the query cache before a screen asks. */

import { queryClient } from "@/lib/query/client";
import { scheduleDayKey } from "@/lib/query/keys";
import { ensureScheduleForDay } from "./reconcile";

/** Short window: a day open is one round trip, and co-carers toggle items live. */
export const SCHEDULE_STALE_MS = 30_000;

/** Warm one pet/day into the query cache. No-ops when the day is already fresh. */
export function prefetchScheduleDay(
  petId: string,
  localYmd: string,
): Promise<void> {
  return queryClient.prefetchQuery({
    queryKey: scheduleDayKey(petId, localYmd),
    queryFn: ({ signal }) => ensureScheduleForDay(petId, localYmd, { signal }),
    staleTime: SCHEDULE_STALE_MS,
  });
}

const WARM_CONCURRENCY = 3;
const MAX_WARM_PETS = 8;

/**
 * Warm every pet's schedule for a day so switching pets is a cache read.
 *
 * This mirrors `warmPetDetailsCache`, which is why the Dashboard already felt
 * instant on a pet switch while the Schedule tab had to fetch on every tap.
 */
export async function warmScheduleForPets(
  petIds: string[],
  localYmd: string,
): Promise<void> {
  const queue = petIds
    .slice(0, MAX_WARM_PETS)
    .filter(
      (id) => queryClient.getQueryData(scheduleDayKey(id, localYmd)) == null,
    );
  if (queue.length === 0) return;

  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(WARM_CONCURRENCY, queue.length) }, async () => {
      while (cursor < queue.length) {
        const petId = queue[cursor++]!;
        await prefetchScheduleDay(petId, localYmd);
      }
    }),
  );
}
