/**
 * Per-item schedule completion sync.
 *
 * Taps update React Query optimistically (and call `beginScheduleItemToggle`)
 * before invoking this. A single loop per item serializes network work and
 * always converges to the latest intent, so rapid complete ↔ uncomplete feels
 * instant without leaving the DB on a stale intermediate state.
 */

import {
  activitiesSincePrefixKey,
  allActivitiesKey,
  scheduleDayKey,
  todayActivitiesPrefixKey,
} from "@/lib/query/keys";
import { queryClient } from "@/lib/query/client";
import type { PetScheduleItem } from "@/types/database";
import { completeScheduleItem, uncompleteScheduleItem } from "./complete";
import {
  endScheduleItemToggle,
  isLatestScheduleItemToggle,
} from "./reconcile";

type ToggleIntent = {
  generation: number;
  completed: boolean;
  userId: string;
  petId: string;
};

const intents = new Map<string, ToggleIntent>();
const loops = new Map<string, Promise<void>>();

type Waiter = {
  generation: number;
  resolve: (item: PetScheduleItem | null) => void;
  reject: (error: unknown) => void;
};

const waiters = new Map<string, Waiter[]>();

function invalidateActivityCaches(petId: string) {
  void queryClient.invalidateQueries({
    queryKey: todayActivitiesPrefixKey(petId),
  });
  void queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
  void queryClient.invalidateQueries({
    queryKey: activitiesSincePrefixKey(petId),
  });
}

function patchScheduleItemInCache(item: PetScheduleItem) {
  const key = scheduleDayKey(item.pet_id, item.local_date);
  queryClient.setQueryData<PetScheduleItem[]>(key, (old) => {
    if (!old) return [item];
    let found = false;
    const next = old.map((row) => {
      if (row.id !== item.id) return row;
      found = true;
      return item;
    });
    return found ? next : [...next, item];
  });
}

function addWaiter(itemId: string, waiter: Waiter) {
  const list = waiters.get(itemId) ?? [];
  list.push(waiter);
  waiters.set(itemId, list);
}

function settleWaiters(
  itemId: string,
  generation: number,
  result:
    | { ok: true; item: PetScheduleItem | null }
    | { ok: false; error: unknown },
) {
  const list = waiters.get(itemId);
  if (!list?.length) return;

  const remaining: Waiter[] = [];
  for (const waiter of list) {
    if (waiter.generation !== generation) {
      remaining.push(waiter);
      continue;
    }
    if (result.ok) waiter.resolve(result.item);
    else waiter.reject(result.error);
  }

  if (remaining.length) waiters.set(itemId, remaining);
  else waiters.delete(itemId);
}

/** Resolve waiters whose intent was superseded by a newer tap. */
function resolveSupersededWaiters(itemId: string, latestGeneration: number) {
  const list = waiters.get(itemId);
  if (!list?.length) return;

  const remaining: Waiter[] = [];
  for (const waiter of list) {
    if (waiter.generation < latestGeneration) {
      waiter.resolve(null);
    } else {
      remaining.push(waiter);
    }
  }

  if (remaining.length) waiters.set(itemId, remaining);
  else waiters.delete(itemId);
}

async function runLoop(itemId: string): Promise<void> {
  try {
    while (intents.has(itemId)) {
      const intent = intents.get(itemId)!;
      const { generation, completed, userId, petId } = intent;

      try {
        const result = completed
          ? await completeScheduleItem(itemId, userId)
          : await uncompleteScheduleItem(itemId);

        if (!isLatestScheduleItemToggle(itemId, generation)) {
          // A newer tap owns the UI; keep looping toward its intent.
          continue;
        }

        patchScheduleItemInCache(result);
        invalidateActivityCaches(petId);

        const serverCompleted = !!result.completed_at;
        if (serverCompleted === completed) {
          intents.delete(itemId);
          endScheduleItemToggle(itemId, generation);
          settleWaiters(itemId, generation, { ok: true, item: result });
        }
        // else: server didn't match desire — loop and retry
      } catch (error) {
        if (!isLatestScheduleItemToggle(itemId, generation)) {
          continue;
        }
        intents.delete(itemId);
        endScheduleItemToggle(itemId, generation);
        settleWaiters(itemId, generation, { ok: false, error });
        throw error;
      }
    }
  } finally {
    loops.delete(itemId);
    if (intents.has(itemId) && !loops.has(itemId)) {
      const again = runLoop(itemId);
      loops.set(itemId, again);
      void again.catch(() => {
        /* waiter rejection surfaces to the owning mutate() */
      });
    }
  }
}

function ensureLoop(itemId: string): Promise<void> {
  const existing = loops.get(itemId);
  if (existing) return existing;

  const promise = runLoop(itemId);
  loops.set(itemId, promise);
  void promise.catch(() => {
    /* Errors are delivered to waiters; keep the loop map tidy via finally. */
  });
  return promise;
}

/**
 * Converge a schedule item to `completed` for the generation already started in
 * `onMutate` via `beginScheduleItemToggle`. Safe under rapid re-taps — only the
 * latest intent is written to the server; superseded calls resolve `null`.
 */
export function syncScheduleItemCompletion(args: {
  itemId: string;
  userId: string;
  petId: string;
  completed: boolean;
  generation: number;
}): Promise<PetScheduleItem | null> {
  const { itemId, userId, petId, completed, generation } = args;

  /**
   * `mutationFn` calls can reorder relative to newer taps' `onMutate`. Never
   * let an older generation overwrite a newer intent (or revive one after the
   * latest tap already settled).
   */
  if (!isLatestScheduleItemToggle(itemId, generation)) {
    return Promise.resolve(null);
  }

  intents.set(itemId, {
    generation,
    completed,
    userId,
    petId,
  });
  resolveSupersededWaiters(itemId, generation);

  const settled = new Promise<PetScheduleItem | null>((resolve, reject) => {
    addWaiter(itemId, { generation, resolve, reject });
  });

  ensureLoop(itemId);
  return settled;
}
