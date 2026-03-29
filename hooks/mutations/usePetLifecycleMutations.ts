import {
  healthSnapshotKey,
  petDetailsQueryKey,
  petsQueryKey,
  todayActivitiesPrefixKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  deletePet,
  fetchUserPets,
  memorializePet,
  unmemorializePet,
} from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import { useMutation } from "@tanstack/react-query";

function invalidateSharedPetQueries(userId: string, petId: string) {
  void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
  void queryClient.invalidateQueries({
    queryKey: healthSnapshotKey(userId),
  });
  void queryClient.invalidateQueries({ queryKey: ["todayActivities"] });
  void queryClient.invalidateQueries({ queryKey: ["allActivities"] });
  void queryClient.invalidateQueries({
    queryKey: todayActivitiesPrefixKey(petId),
  });
  void queryClient.invalidateQueries({ queryKey: petDetailsQueryKey(petId) });
}

async function syncActivePetFromServer(userId: string) {
  const pets = await queryClient.fetchQuery({
    queryKey: petsQueryKey(userId),
    queryFn: () => fetchUserPets(userId),
  });
  usePetStore.getState().initActivePetFromList(pets);
}

export function useMemorializePetMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      return memorializePet(userId, petId);
    },
    onSuccess: async () => {
      if (!userId) return;
      invalidateSharedPetQueries(userId, petId);
      await syncActivePetFromServer(userId);
    },
  });
}

export function useUnmemorializePetMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      return unmemorializePet(userId, petId);
    },
    onSuccess: async () => {
      if (!userId) return;
      invalidateSharedPetQueries(userId, petId);
      await syncActivePetFromServer(userId);
    },
  });
}

export function useDeletePetMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      await deletePet(userId, petId);
    },
    onSuccess: async () => {
      if (!userId) return;
      queryClient.removeQueries({ queryKey: petDetailsQueryKey(petId) });
      invalidateSharedPetQueries(userId, petId);
      await syncActivePetFromServer(userId);
    },
  });
}
