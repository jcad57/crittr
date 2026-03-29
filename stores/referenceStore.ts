import { supabase } from "@/lib/supabase";
import type { Breed, CommonAllergy } from "@/types/database";
import { create } from "zustand";

/** Stable empty arrays — return these from selectors to avoid useSyncExternalStore infinite loops. */
export const EMPTY_BREEDS: Breed[] = [];
export const EMPTY_ALLERGIES: CommonAllergy[] = [];

type ReferenceState = {
  breeds: Record<string, Breed[]>;
  allergies: Record<string, CommonAllergy[]>;
  loadingTypes: Set<string>;

  fetchForPetType: (petType: string) => Promise<void>;
};

export const useReferenceStore = create<ReferenceState>((set, get) => ({
  breeds: {},
  allergies: {},
  loadingTypes: new Set(),

  fetchForPetType: async (petType: string) => {
    const { breeds, allergies, loadingTypes } = get();
    if (breeds[petType] || loadingTypes.has(petType)) return;

    set({ loadingTypes: new Set([...loadingTypes, petType]) });

    try {
      const [breedsRes, allergiesRes] = await Promise.all([
        supabase
          .from("breeds")
          .select("*")
          .eq("pet_type", petType)
          .order("name"),
        supabase
          .from("common_allergies")
          .select("*")
          .eq("pet_type", petType)
          .order("name"),
      ]);

      set((s) => ({
        breeds: { ...s.breeds, [petType]: breedsRes.data ?? [] },
        allergies: { ...s.allergies, [petType]: allergiesRes.data ?? [] },
      }));
    } catch (error) {
      console.error(`Failed to fetch reference data for ${petType}:`, error);
    } finally {
      set((s) => {
        const next = new Set(s.loadingTypes);
        next.delete(petType);
        return { loadingTypes: next };
      });
    }
  },
}));
