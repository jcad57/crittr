import { supabase } from "@/lib/supabase";
import type { Pet, PetWithDetails } from "@/types/database";
import { create } from "zustand";

type PetState = {
  pets: Pet[];
  activePetId: string | null;
  isLoading: boolean;

  fetchPets: () => Promise<void>;
  fetchPetProfile: (id: string) => Promise<PetWithDetails | null>;
  setActivePet: (id: string) => void;
  clear: () => void;
};

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  activePetId: null,
  isLoading: false,

  fetchPets: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const pets = data ?? [];
      const active = pets.find((p) => p.is_active) ?? pets[0];
      set({ pets, activePetId: active?.id ?? null });
    } catch (error) {
      console.error("Failed to fetch pets:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPetProfile: async (id) => {
    try {
      const { data: pet, error: petError } = await supabase
        .from("pets")
        .select("*")
        .eq("id", id)
        .single();

      if (petError || !pet) return null;

      const [foodsRes, medsRes, exerciseRes] = await Promise.all([
        supabase.from("pet_foods").select("*").eq("pet_id", id),
        supabase.from("pet_medications").select("*").eq("pet_id", id),
        supabase.from("pet_exercises").select("*").eq("pet_id", id).single(),
      ]);

      return {
        ...pet,
        foods: foodsRes.data ?? [],
        medications: medsRes.data ?? [],
        exercise: exerciseRes.data ?? null,
      } as PetWithDetails;
    } catch (error) {
      console.error("Failed to fetch pet profile:", error);
      return null;
    }
  },

  setActivePet: (id) => set({ activePetId: id }),

  clear: () => set({ pets: [], activePetId: null }),
}));
