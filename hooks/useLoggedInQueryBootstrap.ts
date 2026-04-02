import {
  healthSnapshotKey,
  pendingInvitesKey,
  petDetailsQueryKey,
  petsQueryKey,
  profileQueryKey,
} from "@/hooks/queries/queryKeys";
import { fetchOwnerHealthSnapshot } from "@/services/health";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { fetchAccessiblePets, fetchPetProfile } from "@/services/pets";
import { fetchProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import { useEffect } from "react";

/**
 * Warm TanStack Query cache on mount for the logged-in session:
 * - Hydrates `profile` from Zustand (auth) so React Query matches client state.
 * - Prefetches profile + pets list + each pet’s details (same pattern as `usePetsQuery`).
 */
export function useLoggedInQueryBootstrap() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  useEffect(() => {
    if (!userId) return;

    const { profile } = useAuthStore.getState();
    if (profile) {
      queryClient.setQueryData(profileQueryKey(userId), profile);
    }

    void queryClient.prefetchQuery({
      queryKey: profileQueryKey(userId),
      queryFn: () => fetchProfile(userId),
    });

    void queryClient.prefetchQuery({
      queryKey: petsQueryKey(userId),
      queryFn: async () => {
        const pets = await fetchAccessiblePets(userId);
        for (const pet of pets) {
          const key = petDetailsQueryKey(pet.id);
          if (queryClient.getQueryData(key) != null) continue;
          void queryClient.prefetchQuery({
            queryKey: key,
            queryFn: () => fetchPetProfile(pet.id),
          });
        }
        return pets;
      },
    });

    void queryClient.prefetchQuery({
      queryKey: healthSnapshotKey(userId),
      queryFn: () => fetchOwnerHealthSnapshot(userId),
    });
  }, [userId]);

  /** When co-care rows change (removed / invited), refresh pets + auth so UI and permissions stay in sync. */
  useEffect(() => {
    if (!userId) return;

    /**
     * No `filter` on postgres_changes: filtered subs can trigger
     * "mismatch between server and client bindings" on hosted Realtime (supabase-js #1917).
     * RLS still applies — users only receive changes for rows they may access.
     */
    const channel = supabase
      .channel(`pet_co_carers_bootstrap:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pet_co_carers",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: petsQueryKey(userId),
          });
          void queryClient.invalidateQueries({
            queryKey: healthSnapshotKey(userId),
          });
          void queryClient.invalidateQueries({
            queryKey: pendingInvitesKey(userId),
          });
          void queryClient.invalidateQueries({ queryKey: ["coCarers"] });
          void queryClient.invalidateQueries({ queryKey: ["sentInvites"] });
          void queryClient.invalidateQueries({
            predicate: (query) => {
              const k = query.queryKey;
              return (
                Array.isArray(k) &&
                k[0] === "petPermissions" &&
                k[2] === userId
              );
            },
          });
          void useAuthStore.getState().refreshAuthSession();
          void fetchAccessiblePets(userId)
            .then((pets) => {
              usePetStore.getState().initActivePetFromList(pets);
            })
            .catch(() => {});
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" && err && __DEV__) {
          console.warn("[Realtime] pet_co_carers channel:", err.message);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
