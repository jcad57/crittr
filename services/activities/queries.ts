/** Reads of `pet_activities`: by id, by day, by pet set, and paged history. */

import { supabase } from "@/lib/supabase";
import type { PetActivity } from "@/types/database";

export async function fetchActivityById(
  activityId: string,
): Promise<PetActivity | null> {
  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("id", activityId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PetActivity | null;
}

export async function fetchTodayActivities(
  petId: string,
): Promise<PetActivity[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("pet_id", petId)
    .gte("logged_at", startOfDay.toISOString())
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

export async function fetchActivitiesSinceForPetIds(
  petIds: string[],
  sinceIso: string,
): Promise<PetActivity[]> {
  if (petIds.length === 0) return [];

  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .in("pet_id", petIds)
    .gte("logged_at", sinceIso)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

export async function fetchActivitiesSince(
  petId: string,
  sinceIso: string,
): Promise<PetActivity[]> {
  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("pet_id", petId)
    .gte("logged_at", sinceIso)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

/** Today's activities for any of the given pets (e.g. Health hub multi-pet). */
export async function fetchTodayActivitiesForPetIds(
  petIds: string[],
): Promise<PetActivity[]> {
  if (petIds.length === 0) return [];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .in("pet_id", petIds)
    .gte("logged_at", startOfDay.toISOString())
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

/**
 * Every activity a pet logged on one local calendar day.
 *
 * Backs the history screen's date filter, which would otherwise only be able to
 * search the pages the user happens to have scrolled far enough to load.
 */
export async function fetchActivitiesForPetOnDay(
  petId: string,
  localYmd: string,
): Promise<PetActivity[]> {
  const [year, month, day] = localYmd.split("-").map((n) => parseInt(n, 10));
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);

  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("pet_id", petId)
    .gte("logged_at", start.toISOString())
    .lte("logged_at", end.toISOString())
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

/**
 * One page of a pet's activity history, newest first.
 *
 * History is unbounded and grows every day a pet is logged. Fetching all of it
 * meant a multi-hundred-kilobyte response that had to be parsed, mapped and
 * grouped on the JS thread before the screen could show anything.
 */
export async function fetchActivitiesForPet(
  petId: string,
  page: { limit: number; offset: number },
): Promise<PetActivity[]> {
  const { data, error } = await supabase
    .from("pet_activities")
    .select("*")
    .eq("pet_id", petId)
    .order("logged_at", { ascending: false })
    .range(page.offset, page.offset + page.limit - 1);

  if (error) throw error;
  return (data ?? []) as PetActivity[];
}

