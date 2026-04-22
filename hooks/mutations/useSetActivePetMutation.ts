import { petsQueryKey } from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { setActivePet as setActivePetService } from "@/services/pets";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { PetWithRole } from "@/types/database";
import { useMutation } from "@tanstack/react-query";

type SetActivePetContext = {
  previous?: PetWithRole[];
  previousActivePetId: string | null;
};

/**
 * Mutation that sets the active pet:
 *   1. Optimistically flips `is_active` on owned pets in the `petsQueryKey`
 *      cache so consumers (e.g. `usePetsQuery`) reflect the change immediately
 *      without a refetch.
 *   2. Updates `petStore.activePetId` for snappy local navigation state.
 *   3. Persists to Supabase via `setActivePet` service.
 *   4. Rolls back the cache + selection on error.
 *
 * Co-care selections are tolerated: RLS prevents writes to non-owned pets, so
 * the DB write effectively no-ops while local + cache state still update for
 * UX consistency.
 */
export function useSetActivePetMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation<void, Error, string, SetActivePetContext>({
    mutationKey: ["setActivePet"],
    mutationFn: async (petId) => {
      if (!userId) return;
      await setActivePetService(userId, petId);
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
    onError: (_err, _petId, ctx) => {
      if (!ctx) return;
      usePetStore.getState().setActivePetId(ctx.previousActivePetId);
      if (userId && ctx.previous) {
        queryClient.setQueryData(petsQueryKey(userId), ctx.previous);
      }
    },
  });
}
