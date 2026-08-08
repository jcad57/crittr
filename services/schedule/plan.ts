/**
 * What a pet’s day should contain, and writing that plan to the schedule rows.
 *
 * The profile is the source of truth for which slots exist; completion state
 * survives only while its slot still does.
 */

import { queryClient } from "@/lib/query/client";
import { petDetailsQueryKey, petVetVisitsQueryKey } from "@/lib/query/keys";
import { supabase } from "@/lib/supabase";
import { fetchPetVetVisits } from "@/services/health";
import { fetchPetProfile } from "@/services/pets";
import type {
  PetScheduleItem,
  PetVetVisit,
  PetWithDetails,
  PlannedScheduleItem,
} from "@/types/database";
import { parseScheduleTime } from "@/utils/schedulePeriods";

function sourceKey(item: {
  source_kind: string;
  source_id: string;
  source_slot: string;
}): string {
  return `${item.source_kind}::${item.source_id}::${item.source_slot ?? ""}`;
}

/**
 * Sync live profile → schedule rows.
 * Profile is source of truth for *which* slots exist. Completion state is kept
 * only while the slot still exists on the profile; removed profile sources are
 * deleted from the schedule even if previously completed.
 */
export async function upsertPlannedItems(
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

export async function resolvePetDetailsForSchedule(
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

export async function resolveVetVisitsForSchedule(
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
export function planNeedsSync(
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
