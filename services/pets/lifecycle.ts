/** Memorialising, restoring and deleting a pet. */

import { supabase } from "@/lib/supabase";
import { ensureOneActivePet } from "./activePet";
import type { Pet } from "@/types/database";

export async function memorializePet(ownerId: string, petId: string): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .update({
      is_memorialized: true,
      memorialized_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  await ensureOneActivePet(ownerId);
  return data as Pet;
}

/** Clear memorial status so the pet appears again on the dashboard and in activity flows. */
export async function unmemorializePet(
  ownerId: string,
  petId: string,
): Promise<Pet> {
  const { data, error } = await supabase
    .from("pets")
    .update({
      is_memorialized: false,
      memorialized_at: null,
    })
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error) throw error;
  await ensureOneActivePet(ownerId);
  return data as Pet;
}

export async function deletePet(ownerId: string, petId: string): Promise<void> {
  const { error } = await supabase
    .from("pets")
    .delete()
    .eq("id", petId)
    .eq("owner_id", ownerId);

  if (error) throw error;
  await ensureOneActivePet(ownerId);
}
