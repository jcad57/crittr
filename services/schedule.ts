import {
  petDetailsQueryKey,
  petVetVisitsQueryKey,
  scheduleDayKey,
  schedulePetPrefixKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import {
  deletePetActivity,
  logExercise,
  logFood,
  logMedication,
} from "@/services/activities";
import { fetchPetVetVisits } from "@/services/health";
import { fetchPetProfile } from "@/services/pets";
import type {
  ExerciseFormData,
  FoodActivityFormData,
  MedicationActivityFormData,
  PetActivity,
  PetScheduleItem,
  PetVetVisit,
  PetWithDetails,
  PlannedScheduleItem,
  ScheduleSourceKind,
} from "@/types/database";
import { FOOD_ACTIVITY_OTHER_ID } from "@/types/database";
import { buildPlannedScheduleForDay } from "@/utils/buildSchedulePlan";
import { getLocalYmd } from "@/utils/localCalendarDate";
import {
  scheduleDisplayFieldsFromActivity,
  withFoodBrand,
} from "@/utils/scheduleDisplayFromActivity";
import { parseScheduleTime } from "@/utils/schedulePeriods";

const FORWARD_SYNC_DAYS = 14;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sourceKey(item: {
  source_kind: string;
  source_id: string;
  source_slot: string;
}): string {
  return `${item.source_kind}::${item.source_id}::${item.source_slot ?? ""}`;
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return getLocalYmd(dt);
}

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

function metaString(meta: Record<string, unknown>, key: string): string {
  const v = meta[key];
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function metaBool(meta: Record<string, unknown>, key: string): boolean {
  return meta[key] === true;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function parseAmount(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const n = parseFloat(t);
  return Number.isFinite(n) ? String(n) : "";
}

export async function fetchScheduleItemsForDay(
  petId: string,
  localYmd: string,
): Promise<PetScheduleItem[]> {
  const { data, error } = await supabase
    .from("pet_schedule_items")
    .select("*")
    .eq("pet_id", petId)
    .eq("local_date", localYmd)
    .order("scheduled_time", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PetScheduleItem[];
}

/**
 * Sync live profile → schedule rows.
 * Profile is source of truth for *which* slots exist. Completion state is kept
 * only while the slot still exists on the profile; removed profile sources are
 * deleted from the schedule even if previously completed.
 */
async function upsertPlannedItems(
  planned: PlannedScheduleItem[],
  existing: PetScheduleItem[],
): Promise<void> {
  const existingByKey = new Map(existing.map((e) => [sourceKey(e), e]));
  const plannedKeys = new Set(planned.map(sourceKey));
  const now = new Date().toISOString();

  const toInsert: Record<string, unknown>[] = [];
  const fieldUpdates: { id: string; patch: Record<string, unknown> }[] = [];

  for (const p of planned) {
    const prev = existingByKey.get(sourceKey(p));
    if (!prev) {
      toInsert.push({
        pet_id: p.pet_id,
        local_date: p.local_date,
        scheduled_time: p.scheduled_time,
        activity_type: p.activity_type,
        source_kind: p.source_kind,
        source_id: p.source_id,
        source_slot: p.source_slot,
        label: p.label,
        detail_line: p.detail_line,
        quantity_line: p.quantity_line,
        notes: p.notes,
        meta: p.meta,
        completed_at: null,
        activity_id: null,
        updated_at: now,
      });
      continue;
    }

    // Preserve completed_at / activity_id — only refresh profile-derived fields.
    fieldUpdates.push({
      id: prev.id,
      patch: {
        scheduled_time: p.scheduled_time,
        activity_type: p.activity_type,
        label: p.label,
        detail_line: p.detail_line,
        quantity_line: p.quantity_line,
        notes: p.notes,
        meta: p.meta,
        updated_at: now,
      },
    });
  }

  const writeTasks: Promise<void>[] = [];

  if (toInsert.length > 0) {
    writeTasks.push(
      (async () => {
        const { error } = await supabase
          .from("pet_schedule_items")
          .insert(toInsert);
        if (error) throw error;
      })(),
    );
  }

  if (fieldUpdates.length > 0) {
    writeTasks.push(
      ...fieldUpdates.map(async (row) => {
        const { error } = await supabase
          .from("pet_schedule_items")
          .update(row.patch)
          .eq("id", row.id);
        if (error) throw error;
      }),
    );
  }

  /** Anything not on the live profile plan — completed or not — leaves the schedule. */
  const staleIds = existing
    .filter((e) => !plannedKeys.has(sourceKey(e)))
    .map((e) => e.id);

  if (staleIds.length > 0) {
    writeTasks.push(
      (async () => {
        const { error } = await supabase
          .from("pet_schedule_items")
          .delete()
          .in("id", staleIds);
        if (error) throw error;
      })(),
    );
  }

  if (writeTasks.length > 0) {
    await Promise.all(writeTasks);
  }
}

async function resolvePetDetailsForSchedule(
  petId: string,
  opts?: { fresh?: boolean },
): Promise<PetWithDetails | null> {
  if (!opts?.fresh) {
    const cached = queryClient.getQueryData<PetWithDetails>(
      petDetailsQueryKey(petId),
    );
    if (cached) return cached;
  }

  const details = await fetchPetProfile(petId);
  if (details) {
    queryClient.setQueryData(petDetailsQueryKey(petId), details);
  }
  return details;
}

async function resolveVetVisitsForSchedule(
  petId: string,
  opts?: { fresh?: boolean },
): Promise<PetVetVisit[]> {
  if (!opts?.fresh) {
    const cached = queryClient.getQueryData<PetVetVisit[]>(
      petVetVisitsQueryKey(petId),
    );
    if (cached) return cached;
  }

  const visits = await fetchPetVetVisits(petId);
  queryClient.setQueryData(petVetVisitsQueryKey(petId), visits);
  return visits;
}

function sameNullableText(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return (a?.trim() || null) === (b?.trim() || null);
}

function sameScheduledTime(a: string, b: string): boolean {
  const pa = parseScheduleTime(a);
  const pb = parseScheduleTime(b);
  return pa.hour === pb.hour && pa.minute === pb.minute;
}

/**
 * True when schedule rows diverge from the live profile plan.
 * Orphan rows (including completed) that are no longer on the profile count.
 */
function planNeedsSync(
  planned: PlannedScheduleItem[],
  existing: PetScheduleItem[],
): boolean {
  const existingByKey = new Map(existing.map((e) => [sourceKey(e), e]));
  const plannedKeys = new Set(planned.map(sourceKey));

  for (const p of planned) {
    const prev = existingByKey.get(sourceKey(p));
    if (!prev) return true;
    if (!sameScheduledTime(prev.scheduled_time, p.scheduled_time)) return true;
    if (prev.activity_type !== p.activity_type) return true;
    if (prev.label !== p.label) return true;
    if (!sameNullableText(prev.detail_line, p.detail_line)) return true;
    if (!sameNullableText(prev.quantity_line, p.quantity_line)) return true;
    if (!sameNullableText(prev.notes, p.notes)) return true;
  }

  for (const e of existing) {
    if (!plannedKeys.has(sourceKey(e))) return true;
  }

  return false;
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
function abortBackgroundReconciles(petId: string): void {
  const prefix = `${petId}:`;
  for (const [key, controller] of backgroundReconciles) {
    if (key.startsWith(prefix)) controller.abort();
  }
}

/**
 * Item ids with an optimistic toggle that hasn't been confirmed by the server.
 * A background reconcile reads rows that predate the toggle, so replaying its
 * result verbatim would visibly un-tick the item the user just tapped.
 */
const pendingToggleItemIds = new Set<string>();

export function beginScheduleItemToggle(itemId: string): void {
  pendingToggleItemIds.add(itemId);
}

export function endScheduleItemToggle(itemId: string): void {
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

async function createActivityForScheduleItem(
  item: PetScheduleItem,
  userId: string,
  loggedAt: string,
): Promise<string | null> {
  const meta = (item.meta ?? {}) as Record<string, unknown>;

  if (item.activity_type === "food") {
    const foodIdRaw = metaString(meta, "food_id");
    const hasFoodId = foodIdRaw.length > 0 && isUuid(foodIdRaw);
    let amount = parseAmount(metaString(meta, "portion_size"));
    let unit = metaString(meta, "portion_unit");
    if (!amount && item.quantity_line) {
      const parts = item.quantity_line.trim().split(/\s+/);
      if (parts[0] && /^\d/.test(parts[0]!)) {
        amount = parseAmount(parts[0]!);
        unit = parts.slice(1).join(" ") || unit;
      }
    }
    const form: FoodActivityFormData = {
      label: item.label,
      isTreat:
        metaBool(meta, "is_treat") || item.source_kind === "food_treat",
      foodId: hasFoodId ? foodIdRaw : FOOD_ACTIVITY_OTHER_ID,
      foodBrand: item.detail_line?.trim() || item.label,
      amount,
      unit,
      notes: item.notes ?? "",
    };
    const act = await logFood(item.pet_id, userId, form, { loggedAt });
    return act.id;
  }

  if (item.activity_type === "medication") {
    const medIdRaw =
      metaString(meta, "medication_id") ||
      (isUuid(item.source_id) ? item.source_id : "");
    const form: MedicationActivityFormData = {
      medicationId: medIdRaw,
      medicationName: item.label,
      amount: parseAmount(metaString(meta, "amount")),
      unit: metaString(meta, "unit"),
      notes: item.notes ?? "",
    };
    const act = await logMedication(item.pet_id, userId, form, { loggedAt });
    return act.id;
  }

  if (item.activity_type === "exercise") {
    const mins = meta.duration_minutes;
    const form: ExerciseFormData = {
      label: item.label,
      exerciseType: metaString(meta, "exercise_type") || item.label || "Walk",
      customExerciseType: "",
      durationHours: "",
      durationMinutes:
        typeof mins === "number" && mins > 0 ? String(mins) : "",
      distanceMiles: "",
      location: item.detail_line ?? "Home",
      notes: item.notes ?? "",
    };
    const act = await logExercise(item.pet_id, userId, form, { loggedAt });
    return act.id;
  }

  if (item.activity_type === "vet_visit") {
    return null;
  }

  return null;
}

/**
 * Mark a schedule item complete: stamp completion, then link a pet_activity.
 */
export async function completeScheduleItem(
  itemId: string,
  userId: string,
): Promise<PetScheduleItem> {
  const { data: row, error: fetchErr } = await supabase
    .from("pet_schedule_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (fetchErr) throw fetchErr;
  const item = row as PetScheduleItem;

  if (item.completed_at) {
    return item;
  }

  const loggedAt = new Date().toISOString();

  // Persist completion first so plan-sync races cannot wipe an in-flight toggle.
  const { data: stamped, error: stampErr } = await supabase
    .from("pet_schedule_items")
    .update({
      completed_at: loggedAt,
      updated_at: loggedAt,
    })
    .eq("id", itemId)
    .is("completed_at", null)
    .select("*")
    .maybeSingle();

  if (stampErr) throw stampErr;

  if (!stamped) {
    const { data: again, error: againErr } = await supabase
      .from("pet_schedule_items")
      .select("*")
      .eq("id", itemId)
      .single();
    if (againErr) throw againErr;
    return again as PetScheduleItem;
  }

  const stampedItem = stamped as PetScheduleItem;

  try {
    const activityId = await createActivityForScheduleItem(
      stampedItem,
      userId,
      loggedAt,
    );

    if (activityId === stampedItem.activity_id) {
      return stampedItem;
    }

    const { data: linked, error: linkErr } = await supabase
      .from("pet_schedule_items")
      .update({
        activity_id: activityId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select("*")
      .single();

    if (linkErr) throw linkErr;
    return linked as PetScheduleItem;
  } catch (e) {
    // Keep the schedule item completed even if activity logging fails —
    // rolling back would make the toggle flicker. Activity can be linked later.
    if (__DEV__) {
      console.warn("[schedule] activity log after complete failed", e);
    }
    return stampedItem;
  }
}

/**
 * Un-complete a schedule item and delete the linked activity (when we created it).
 */
export async function uncompleteScheduleItem(
  itemId: string,
): Promise<PetScheduleItem> {
  const { data: row, error: fetchErr } = await supabase
    .from("pet_schedule_items")
    .select("*")
    .eq("id", itemId)
    .single();
  if (fetchErr) throw fetchErr;
  const item = row as PetScheduleItem;

  const activityId = item.activity_id;
  const kind = item.source_kind as ScheduleSourceKind;

  const { data: updated, error } = await supabase
    .from("pet_schedule_items")
    .update({
      completed_at: null,
      activity_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .single();
  if (error) throw error;

  if (activityId && kind !== "vet_visit") {
    try {
      await deletePetActivity(activityId);
    } catch (e) {
      if (__DEV__) console.warn("[schedule] delete activity on uncomplete", e);
    }
  }

  return updated as PetScheduleItem;
}

/**
 * Refresh snapshotted display fields on every schedule row linked to an activity.
 */
export async function syncScheduleItemsLinkedToActivity(
  activity: PetActivity,
  options?: { foodBrand?: string | null },
): Promise<PetScheduleItem[]> {
  let fields = scheduleDisplayFieldsFromActivity(activity);
  if (activity.activity_type === "food") {
    fields = withFoodBrand(fields, options?.foodBrand);
  }

  const updatePayload: Record<string, unknown> = {
    label: fields.label,
    quantity_line: fields.quantity_line,
    notes: fields.notes,
    updated_at: new Date().toISOString(),
  };
  if (
    fields.detail_line != null ||
    activity.activity_type !== "food" ||
    options?.foodBrand?.trim()
  ) {
    updatePayload.detail_line = fields.detail_line;
  }

  const { data, error } = await supabase
    .from("pet_schedule_items")
    .update(updatePayload)
    .eq("activity_id", activity.id)
    .select("*");

  if (error) throw error;
  return (data ?? []) as PetScheduleItem[];
}

/**
 * @deprecated Prefer {@link syncScheduleItemsLinkedToActivity}.
 */
export async function syncScheduleItemFromActivity(
  scheduleItemId: string,
  fields: {
    label?: string;
    detail_line?: string | null;
    quantity_line?: string | null;
    notes?: string | null;
  },
): Promise<PetScheduleItem> {
  const { data, error } = await supabase
    .from("pet_schedule_items")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleItemId)
    .select("*")
    .single();
  if (error) throw error;
  return data as PetScheduleItem;
}
