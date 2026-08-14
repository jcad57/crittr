/**
 * Deciding when to apply the plan, and doing it exactly once per pet-day.
 *
 * Reconciliation costs several round trips, so it usually runs in the
 * background behind already-rendered rows. That means guarding against
 * overlapping runs, abandoning superseded ones, and never clobbering an item
 * the user is mid-toggle on.
 */

import { queryClient } from "@/lib/query/client";
import { scheduleDayKey } from "@/lib/query/keys";
import type { PetScheduleItem } from "@/types/database";
import { buildPlannedScheduleForDay } from "@/utils/buildSchedulePlan";
import { getLocalYmd } from "@/utils/localCalendarDate";
import {
  planNeedsSync,
  resolvePetDetailsForSchedule,
  resolveVetVisitsForSchedule,
  upsertPlannedItems,
} from "./plan";
import { fetchScheduleItemsForDay } from "./queries";

function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const err = new Error("Aborted");
    err.name = "AbortError";
    throw err;
  }
}

export type EnsureScheduleOptions = {
  signal?: AbortSignal;
  /**
   * When true, always rebuild from a fresh profile fetch (pull-to-refresh /
   * explicit resync). Day opens still reconcile against the profile, but may
   * reuse warm pet-detail / vet-visit caches.
   */
  force?: boolean;
};

/**
 * Reconcile stored rows against the live profile plan, writing any difference.
 * Costs up to four sequential round trips, so callers that already have rows to
 * show should run this in the background rather than await it.
 */
async function reconcileScheduleDay(
  petId: string,
  localYmd: string,
  existing: PetScheduleItem[],
  options: { fresh: boolean; force: boolean; signal?: AbortSignal },
): Promise<PetScheduleItem[]> {
  const { fresh, force, signal } = options;

  const [details, visits] = await Promise.all([
    resolvePetDetailsForSchedule(petId, { fresh }),
    resolveVetVisitsForSchedule(petId, { fresh }),
  ]);
  throwIfAborted(signal);
  if (!details) return existing;

  const planned = buildPlannedScheduleForDay(details, localYmd, visits);

  if (!force && !planNeedsSync(planned, existing)) {
    return existing;
  }

  // Re-read right before write so we never sync over a completion that landed
  // while profile/visits were loading.
  const current = await fetchScheduleItemsForDay(petId, localYmd);
  throwIfAborted(signal);

  await upsertPlannedItems(planned, current);
  throwIfAborted(signal);

  return fetchScheduleItemsForDay(petId, localYmd);
}

/** Keyed by `petId:localYmd` so a day reconciles once no matter how many screens ask. */
const backgroundReconciles = new Map<string, AbortController>();

/**
 * Stop background reconciles for a pet. A reconcile that started before a
 * profile edit is working from the old plan, so letting it finish would undo
 * the resync it raced.
 */
export function abortBackgroundReconciles(petId: string): void {
  const prefix = `${petId}:`;
  for (const [key, controller] of backgroundReconciles) {
    if (key.startsWith(prefix)) controller.abort();
  }
}

/**
 * Item ids with an optimistic toggle that hasn't been confirmed by the server.
 * A background reconcile reads rows that predate the toggle, so replaying its
 * result verbatim would visibly un-tick the item the user just tapped.
 *
 * Generations let rapid complete ↔ uncomplete taps supersede each other: every
 * tap bumps the gen immediately (UI stays snappy), and only the latest gen may
 * patch the cache or clear pending protection when its network work settles.
 */
const pendingToggleItemIds = new Set<string>();
const toggleGenerationByItemId = new Map<string, number>();

/** Begin (or continue) an optimistic toggle; returns this tap's generation. */
export function beginScheduleItemToggle(itemId: string): number {
  const generation = (toggleGenerationByItemId.get(itemId) ?? 0) + 1;
  toggleGenerationByItemId.set(itemId, generation);
  pendingToggleItemIds.add(itemId);
  return generation;
}

export function isLatestScheduleItemToggle(
  itemId: string,
  generation: number,
): boolean {
  return toggleGenerationByItemId.get(itemId) === generation;
}

/**
 * Clear reconcile protection once the latest tap's network work settles.
 * Older generations no-op so an in-flight complete cannot unlock mid-undo.
 */
export function endScheduleItemToggle(
  itemId: string,
  generation?: number,
): void {
  if (
    generation != null &&
    toggleGenerationByItemId.get(itemId) !== generation
  ) {
    return;
  }
  pendingToggleItemIds.delete(itemId);
}

function applyReconciledRows(
  petId: string,
  localYmd: string,
  rows: PetScheduleItem[],
): void {
  queryClient.setQueryData<PetScheduleItem[]>(
    scheduleDayKey(petId, localYmd),
    (cached) => {
      if (!cached) return rows;
      return rows.map((row) => {
        if (!pendingToggleItemIds.has(row.id)) return row;
        const local = cached.find((r) => r.id === row.id);
        return local
          ? {
              ...row,
              completed_at: local.completed_at,
              activity_id: local.activity_id,
            }
          : row;
      });
    },
  );
}

/**
 * Bring a day back in line with the profile without blocking the UI, patching
 * the query cache only when something actually changed.
 */
function reconcileScheduleDayInBackground(
  petId: string,
  localYmd: string,
  existing: PetScheduleItem[],
): void {
  const key = `${petId}:${localYmd}`;
  if (backgroundReconciles.has(key)) return;

  const controller = new AbortController();
  backgroundReconciles.set(key, controller);

  void reconcileScheduleDay(petId, localYmd, existing, {
    fresh: false,
    force: false,
    signal: controller.signal,
  })
    .then((next) => {
      if (controller.signal.aborted) return;
      /** `reconcileScheduleDay` hands back the same array when nothing diverged. */
      if (next !== existing) applyReconciledRows(petId, localYmd, next);
    })
    .catch((e) => {
      if (controller.signal.aborted) return;
      if (__DEV__) console.warn("[schedule] background reconcile", e);
    })
    .finally(() => {
      if (backgroundReconciles.get(key) === controller) {
        backgroundReconciles.delete(key);
      }
    });
}

/**
 * Ensure schedule rows exist for a pet on `localYmd`.
 * Past days are frozen. Today + future reconcile to the live pet profile
 * (source of truth for which slots exist). Completion is preserved only while
 * the matching profile source remains.
 *
 * Stored rows resolve after a single round trip and the profile reconcile runs
 * behind them. Awaiting the reconcile put up to four extra sequential requests
 * in front of every pet switch and tab open, which is what made the Schedule
 * tab feel slower than the rest of the app.
 */
export async function ensureScheduleForDay(
  petId: string,
  localYmd: string,
  signalOrOptions?: AbortSignal | EnsureScheduleOptions,
): Promise<PetScheduleItem[]> {
  const options: EnsureScheduleOptions =
    signalOrOptions instanceof AbortSignal || signalOrOptions == null
      ? { signal: signalOrOptions ?? undefined }
      : signalOrOptions;
  const { signal, force = false } = options;

  throwIfAborted(signal);

  const existing = await fetchScheduleItemsForDay(petId, localYmd);
  throwIfAborted(signal);

  const today = getLocalYmd();
  if (compareYmd(localYmd, today) < 0) {
    return existing;
  }

  if (force) {
    /** Pull-to-refresh is authoritative; don't let a background writer land after it. */
    abortBackgroundReconciles(petId);
    return reconcileScheduleDay(petId, localYmd, existing, {
      fresh: true,
      force: true,
      signal,
    });
  }

  if (existing.length > 0) {
    reconcileScheduleDayInBackground(petId, localYmd, existing);
    return existing;
  }

  /** Nothing stored yet — building has to finish or the day renders as empty. */
  return reconcileScheduleDay(petId, localYmd, existing, {
    fresh: false,
    force: false,
    signal,
  });
}
