import { supabase } from "@/lib/supabase";
import type { PetWeightEntry } from "@/types/database";

/** Returns weight entries for a pet, oldest → newest (chart-friendly). */
export async function fetchPetWeightEntries(
  petId: string,
): Promise<PetWeightEntry[]> {
  const { data, error } = await supabase
    .from("pet_weight_entries")
    .select("*")
    .eq("pet_id", petId)
    .order("recorded_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PetWeightEntry[];
}

/**
 * Delete a single weigh-in entry. The matching `pet_activities` row (if any)
 * is removed automatically via the `weight_entry_id` FK cascade declared in
 * migration `046_weigh_in_activity.sql`.
 *
 * After deletion we re-sync the owning pet's `weight_lbs`/`weight_unit` to
 * whatever the next-most-recent weigh-in is, so the pet profile / dashboard
 * chips don't keep showing the now-deleted reading. If no entries remain we
 * leave the pet's stored weight as-is (the user may have entered it during
 * onboarding without ever logging a weigh-in).
 */
export async function deletePetWeightEntry(entryId: string): Promise<void> {
  const { data: entry, error: fetchErr } = await supabase
    .from("pet_weight_entries")
    .select("id, pet_id")
    .eq("id", entryId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!entry) return;

  const { error: delErr } = await supabase
    .from("pet_weight_entries")
    .delete()
    .eq("id", entryId);

  if (delErr) throw delErr;

  const { data: latest } = await supabase
    .from("pet_weight_entries")
    .select("weight_lbs, weight_unit")
    .eq("pet_id", entry.pet_id)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    const w = Number(latest.weight_lbs);
    if (Number.isFinite(w)) {
      await supabase
        .from("pets")
        .update({
          weight_lbs: w,
          weight_unit:
            latest.weight_unit === "kg" || latest.weight_unit === "lbs"
              ? latest.weight_unit
              : "lbs",
        })
        .eq("id", entry.pet_id);
    }
  }
}
