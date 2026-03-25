import { supabase } from "@/lib/supabase";
import type { Pet, PetWithDetails } from "@/types/database";
import { create } from "zustand";

type PetState = {
  pets: Pet[];
  activePetId: string | null;
  activePetDetails: PetWithDetails | null;
  isLoading: boolean;

  fetchPets: () => Promise<void>;
  fetchActivePetDetails: () => Promise<void>;
  fetchPetProfile: (id: string) => Promise<PetWithDetails | null>;
  setActivePet: (id: string) => void;
  clear: () => void;
};

async function loadPetDetails(id: string): Promise<PetWithDetails | null> {
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
      supabase
        .from("pet_exercises")
        .select("*")
        .eq("pet_id", id)
        .maybeSingle(),
    ]);

    return {
      ...pet,
      foods: foodsRes.data ?? [],
      medications: medsRes.data ?? [],
      exercise: exerciseRes.data ?? null,
    } as PetWithDetails;
  } catch (error) {
    console.error("Failed to fetch pet details:", error);
    return null;
  }
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  activePetId: null,
  activePetDetails: null,
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
      const activePetId = active?.id ?? null;

      let activePetDetails: PetWithDetails | null = null;
      if (activePetId) {
        activePetDetails = await loadPetDetails(activePetId);
      }

      set({ pets, activePetId, activePetDetails });
    } catch (error) {
      console.error("Failed to fetch pets:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchActivePetDetails: async () => {
    const { activePetId, activePetDetails } = get();
    if (!activePetId) {
      set({ activePetDetails: null });
      return;
    }
    if (activePetDetails?.id === activePetId) return;
    const details = await loadPetDetails(activePetId);
    set({ activePetDetails: details });
  },

  fetchPetProfile: async (id) => loadPetDetails(id),

  setActivePet: (id) => set({ activePetId: id, activePetDetails: null }),

  clear: () => set({ pets: [], activePetId: null, activePetDetails: null }),
}));
