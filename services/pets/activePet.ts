/**
 * Which pet the dashboard shows.
 *
 * Exactly one living pet should be `is_active`; the invariant is maintained
 * server-side, with a client fallback for installs predating that function.
 */

import { supabase } from "@/lib/supabase";

/**
 * Server-side helper that guarantees exactly one living, non-archived pet
 * is `is_active = true` for the owner. Used after add-pet / delete-pet flows
 * and to recover from the "dashboard shows zero active pet" state.
 */
export async function repairActivePetSelection(ownerId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("repair_pet_active_flag", {
    target_owner: ownerId,
  });
  if (error) {
    if (__DEV__) console.warn("[repair_pet_active_flag]", error);
    return null;
  }
  return typeof data === "string" ? data : null;
}

/** PostgREST schema-cache miss / undefined function — the migration isn't applied yet. */
function isMissingFunctionError(error: { code?: string | null }): boolean {
  return error.code === "PGRST202" || error.code === "42883";
}

/**
 * Persist the user's active-pet selection.
 *
 * Returns the pet that ended up active for the owner, which is the target for
 * owned pets and the owner's existing selection when the user picked a pet
 * they only co-care for (`is_active` belongs to the owner's account).
 *
 * The write is a single atomic statement server-side: doing it as
 * "set target, then clear the rest" let two quick taps interleave into a state
 * with no active pet at all, which silently reset the selection on next launch.
 */
export async function setActivePet(
  ownerId: string,
  petId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("set_pet_active_flag", {
    target_pet: petId,
  });

  if (!error) return typeof data === "string" ? data : null;
  if (!isMissingFunctionError(error)) throw error;

  return setActivePetLegacy(ownerId, petId);
}

/**
 * Pre-`set_pet_active_flag` path, kept so a client running ahead of the
 * migration still persists something. Only clears the other pets once the
 * target is confirmed owned, so co-care selections can't wipe the flag.
 */
async function setActivePetLegacy(
  ownerId: string,
  petId: string,
): Promise<string | null> {
  const { data: owned, error: setErr } = await supabase
    .from("pets")
    .update({ is_active: true })
    .eq("id", petId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();
  if (setErr) throw setErr;
  if (!owned) return null;

  const { error: clearErr } = await supabase
    .from("pets")
    .update({ is_active: false })
    .eq("owner_id", ownerId)
    .neq("id", petId);
  if (clearErr) throw clearErr;

  return petId;
}

/** After delete or memorialization, ensure one living pet is `is_active` if any exist. */
export async function ensureOneActivePet(ownerId: string): Promise<void> {
  await repairActivePetSelection(ownerId);
}
