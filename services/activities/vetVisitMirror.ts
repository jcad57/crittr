/**
 * Mirroring scheduled vet visits into today's activity feed.
 *
 * Reconciliation, not CRUD: it runs on a schedule and brings the feed in line
 * with `pet_vet_visits`, inserting what is missing and removing what is stale.
 */

import { supabase } from "@/lib/supabase";
import { fetchAccessiblePets } from "@/services/pets";
import type { PetWithRole } from "@/types/database";

/**
 * For each accessible pet, if a vet visit is scheduled for **local calendar today**
 * and no mirror row exists yet (`vet_visit_id`), inserts `pet_activities`.
 * Call on app bootstrap, day rollover, and foreground — not when the visit is first created.
 *
 * Runs as a fixed set of batched statements regardless of how many pets, mirror
 * rows or visits are involved. This is on the cold-start path, so a per-pet or
 * per-row round trip here directly delays the first usable frame.
 *
 * `changedPetIds` is empty when nothing was written, which lets callers skip
 * invalidating activity caches they just populated.
 */
export async function ensureTodayVetVisitMirrorActivities(
  userId: string,
  accessiblePets?: PetWithRole[],
): Promise<{ petIds: string[]; changedPetIds: string[] }> {
  const petsWithRole = accessiblePets ?? (await fetchAccessiblePets(userId));
  const pets = petsWithRole.filter((p) => !p.is_memorialized);
  if (pets.length === 0) return { petIds: [], changedPetIds: [] };

  const petIds = pets.map((p) => p.id);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const todayStartMs = start.getTime();

  const [mirrorRes, todayVisitRes] = await Promise.all([
    supabase
      .from("pet_activities")
      .select("id,pet_id,vet_visit_id")
      .in("pet_id", petIds)
      .not("vet_visit_id", "is", null),
    supabase
      .from("pet_vet_visits")
      .select("id,pet_id,title,visit_at,location,notes")
      .in("pet_id", petIds)
      .gte("visit_at", start.toISOString())
      .lte("visit_at", end.toISOString()),
  ]);

  if (todayVisitRes.error) {
    if (__DEV__) {
      console.warn(
        "[ensureTodayVetVisitMirrorActivities]",
        todayVisitRes.error,
      );
    }
    return { petIds, changedPetIds: [] };
  }

  const mirrors = (mirrorRes.data ?? []).filter((m) => m.vet_visit_id);
  const changedPetIds = new Set<string>();

  /** Resolve every mirrored visit at once so stale mirrors can be spotted in bulk. */
  const mirroredVisitIds = [
    ...new Set(mirrors.map((m) => m.vet_visit_id as string)),
  ];
  const visitDayById = new Map<string, number>();
  if (mirroredVisitIds.length > 0) {
    const { data: visitRows } = await supabase
      .from("pet_vet_visits")
      .select("id,visit_at")
      .in("id", mirroredVisitIds);

    for (const row of visitRows ?? []) {
      const day = new Date(row.visit_at);
      day.setHours(0, 0, 0, 0);
      visitDayById.set(row.id, day.getTime());
    }
  }

  /** The visit was deleted, or moved to a future day and no longer belongs in today's feed. */
  const staleMirrors = mirrors.filter((m) => {
    const day = visitDayById.get(m.vet_visit_id as string);
    return day == null || day > todayStartMs;
  });

  if (staleMirrors.length > 0) {
    const { error } = await supabase
      .from("pet_activities")
      .delete()
      .in(
        "id",
        staleMirrors.map((m) => m.id),
      );
    if (error) {
      if (__DEV__) {
        console.warn("[ensureTodayVetVisitMirrorActivities] delete", error);
      }
    } else {
      staleMirrors.forEach((m) => changedPetIds.add(m.pet_id));
    }
  }

  const survivingMirrorVisitIds = new Set(
    mirrors
      .filter((m) => !staleMirrors.includes(m))
      .map((m) => m.vet_visit_id as string),
  );

  const newRows = (todayVisitRes.data ?? [])
    .filter((v) => !survivingMirrorVisitIds.has(v.id))
    .map((v) => ({
      pet_id: v.pet_id,
      logged_by: userId,
      activity_type: "vet_visit" as const,
      label: v.title,
      logged_at: v.visit_at,
      vet_location: v.location,
      notes: v.notes,
      vet_visit_id: v.id,
    }));

  if (newRows.length > 0) {
    const { error } = await supabase.from("pet_activities").insert(newRows);
    if (error) {
      if (__DEV__) {
        console.warn("[ensureTodayVetVisitMirrorActivities] insert", error);
      }
    } else {
      newRows.forEach((r) => changedPetIds.add(r.pet_id));
    }
  }

  return { petIds, changedPetIds: [...changedPetIds] };
}

