import { supabase } from "@/lib/supabase";
import type { Pet } from "@/types/database";
import { create } from "zustand";

type PetState = {
  activePetId: string | null;

  /** Set active pet locally and persist to Supabase. */
  setActivePet: (id: string) => void;
  /** Derive the active pet id from a fresh pets list (e.g. after query loads). */
  initActivePetFromList: (pets: Pet[]) => void;
  clear: () => void;
};

async function persistActivePetInDb(petId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const ownerId = session.user.id;
  const { error: clearErr } = await supabase
    .from("pets")
    .update({ is_active: false })
    .eq("owner_id", ownerId);
  if (clearErr) {
    console.warn("persistActivePetInDb (clear):", clearErr.message);
    return;
  }
  const { error: setErr } = await supabase
    .from("pets")
    .update({ is_active: true })
    .eq("id", petId)
    .eq("owner_id", ownerId);
  if (setErr) console.warn("persistActivePetInDb (set):", setErr.message);
}

export const usePetStore = create<PetState>((set, get) => ({
  activePetId: null,

  setActivePet: (id) => {
    set({ activePetId: id });
    void persistActivePetInDb(id);
  },

  initActivePetFromList: (pets) => {
    const { activePetId } = get();
    if (activePetId && pets.some((p) => p.id === activePetId)) return;
    const active = pets.find((p) => p.is_active) ?? pets[0];
    const nextId = active?.id ?? null;
    if (activePetId === nextId) return;
    set({ activePetId: nextId });
  },

  clear: () => set({ activePetId: null }),
}));
