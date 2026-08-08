import { petsQueryKey } from "@/lib/query/keys";
import { queryClient } from "@/lib/query/client";
import { setActivePet as setActivePetService } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { PetWithRole } from "@/types/database";
import { useMutation } from "@tanstack/react-query";

type SetActivePetContext = {
  previous?: PetWithRole[];
  previousActivePetId: string | null;
};

const SET_ACTIVE_PET_MUTATION_KEY = ["setActivePet"] as const;

/** Reflect which owned pet the server considers active, without a refetch. */
function writeIsActiveToPetsCache(userId: string, activeOwnedPetId: string | null) {
  queryClient.setQueryData<PetWithRole[]>(petsQueryKey(userId), (previous) =>
    previous?.map((p) =>
      p.role === "owner" ? { ...p, is_active: p.id === activeOwnedPetId } : p,
    ),
  );
}

/**
 * Mutation that sets the active pet:
 *   1. Updates `petStore.activePetId` synchronously so the tap registers on the
 *      next frame, before any network work.
 *   2. Optimistically flips `is_active` on owned pets in the `petsQueryKey`
 *      cache so consumers reflect the change without a refetch.
 *   3. Persists to Supabase via the atomic `set_pet_active_flag` RPC.
 *   4. Rolls back only if no newer tap has superseded this one.
 *
 * Writes are serialised through a mutation `scope`: the persisted selection is
 * account-wide, so overlapping writes used to resolve to the wrong pet — or to
 * no pet at all. `onMutate` still runs immediately for every tap, so
 * serialising the network calls costs nothing in perceived responsiveness.
 *
 * Co-care selections are UI-only. `is_active` lives on the owner's account, so
 * the RPC leaves the caller's own pets alone and reports which one is still
 * active.
 */
export function useSetActivePetMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation<string | null, Error, string, SetActivePetContext>({
    mutationKey: SET_ACTIVE_PET_MUTATION_KEY,
    scope: { id: "set-active-pet" },
    mutationFn: async (petId) => {
      if (!userId) return null;
      return setActivePetService(userId, petId);
    },
    onMutate: async (petId) => {
      const previousActivePetId = usePetStore.getState().activePetId;
      usePetStore.getState().setActivePetId(petId);

      if (!userId) {
        return { previousActivePetId };
      }

      const key = petsQueryKey(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PetWithRole[]>(key);
      if (previous) {
        queryClient.setQueryData<PetWithRole[]>(
          key,
          previous.map((p) =>
            p.role === "owner" ? { ...p, is_active: p.id === petId } : p,
          ),
        );
      }
      return { previous, previousActivePetId };
    },
    onSuccess: (activeOwnedPetId, petId) => {
      if (!userId) return;
      /**
       * Selecting a co-cared pet leaves a different owned pet active, so the
       * optimistic "nothing is active" guess has to be corrected or the next
       * launch would resolve the selection from a stale flag.
       */
      if (activeOwnedPetId !== petId) {
        writeIsActiveToPetsCache(userId, activeOwnedPetId);
      }
    },
    onError: (_err, petId, ctx) => {
      if (!ctx) return;
      /**
       * A newer tap already won. Restoring this one's snapshot would yank the
       * user back to a pet they have since moved off.
       */
      if (usePetStore.getState().activePetId !== petId) return;

      usePetStore.getState().setActivePetId(ctx.previousActivePetId);
      if (userId && ctx.previous) {
        queryClient.setQueryData(petsQueryKey(userId), ctx.previous);
      }
    },
    onSettled: () => {
      if (!userId) return;
      /**
       * Only the last tap in a burst reconciles, so scrubbing through pets
       * costs one pets refetch instead of one per tap.
       */
      if (queryClient.isMutating({ mutationKey: SET_ACTIVE_PET_MUTATION_KEY }) > 1) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: petsQueryKey(userId) });
    },
  });
}
