import { supabase } from "@/lib/supabase";
import type { ExercisePlanFormEntry, PetExercisePlan } from "@/types/database";

export type PetExercisePlanInput = {
  label: string;
  days_of_week: number[];
  /** Postgres `time` as `HH:MM:SS`. */
  scheduled_time: string;
  notes: string | null;
};

export function exercisePlanFormEntryToInput(
  e: ExercisePlanFormEntry,
): PetExercisePlanInput {
  return {
    label: e.label.trim(),
    days_of_week: [...e.daysOfWeek].sort((a, b) => a - b),
    scheduled_time: e.scheduledTimePg.trim(),
    notes: e.notes.trim() || null,
  };
}

export async function fetchExercisePlansForPet(
  petId: string,
): Promise<PetExercisePlan[]> {
  const { data, error } = await supabase
    .from("pet_exercise_plans")
    .select("*")
    .eq("pet_id", petId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PetExercisePlan[];
}

/** Delete all plans for a pet and insert the provided list (sort_order = index). */
export async function replacePetExercisePlans(
  petId: string,
  plans: PetExercisePlanInput[],
): Promise<PetExercisePlan[]> {
  const { error: delErr } = await supabase
    .from("pet_exercise_plans")
    .delete()
    .eq("pet_id", petId);

  if (delErr) throw delErr;

  if (plans.length === 0) return [];

  const rows = plans.map((p, i) => ({
    pet_id: petId,
    label: p.label.trim(),
    days_of_week: p.days_of_week,
    scheduled_time: p.scheduled_time,
    notes: p.notes?.trim() || null,
    sort_order: i,
  }));

  const { data, error } = await supabase
    .from("pet_exercise_plans")
    .insert(rows)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PetExercisePlan[];
}
