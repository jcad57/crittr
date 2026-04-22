import { isPetActiveForDashboard } from "@/utils/petParticipation";
import type { Pet } from "@/types/database";
import { create } from "zustand";

type PetState = {
  activePetId: string | null;

  /**
   * Set the active pet id locally only. Persistence to Supabase and optimistic
   * cache updates live in `useSetActivePetMutation`. Use this directly only for
   * cases that don't need DB persistence (e.g. cache rollback inside the
   * mutation, or `initActivePetFromList`).
   */
  setActivePetId: (id: string | null) => void;
  /** Derive the active pet id from a fresh pets list (e.g. after query loads). */
  initActivePetFromList: (pets: Pet[]) => void;
  clear: () => void;
};

export const usePetStore = create<PetState>((set, get) => ({
  activePetId: null,

  setActivePetId: (id) => {
    if (get().activePetId === id) return;
    set({ activePetId: id });
  },

  initActivePetFromList: (pets) => {
    const { activePetId } = get();
    const living = pets.filter(isPetActiveForDashboard);
    if (living.length === 0) {
      if (activePetId !== null) set({ activePetId: null });
      return;
    }
    if (activePetId && living.some((p) => p.id === activePetId)) return;
    const active = living.find((p) => p.is_active) ?? living[0];
    const nextId = active?.id ?? null;
    if (activePetId === nextId) return;
    set({ activePetId: nextId });
  },

  clear: () => set({ activePetId: null }),
}));
