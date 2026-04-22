import type { Pet } from "@/types/database";

/** Oldest added first, newest at the bottom (matches `fetchUserPets` order). */
export function sortPetsByCreatedAt(list: Pet[]): Pet[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}
