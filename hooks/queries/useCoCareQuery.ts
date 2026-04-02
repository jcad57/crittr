import {
  fetchCoCarersForPet,
  fetchPendingInvitesForUser,
  fetchSentInvitesForPet,
  fetchUserPermissionsForPet,
  type CoCarerWithProfile,
} from "@/services/coCare";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import type { CoCarePermissions, CoCarerInvite } from "@/types/database";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  coCarersForPetKey,
  pendingInvitesKey,
  sentInvitesForPetKey,
  userPetPermissionsKey,
} from "./queryKeys";

export function useCoCarersForPetQuery(
  petId: string | null | undefined,
): UseQueryResult<CoCarerWithProfile[], Error> {
  return useQuery({
    queryKey: coCarersForPetKey(petId ?? ""),
    queryFn: () => fetchCoCarersForPet(petId!),
    enabled: !!petId,
  });
}

export function useSentInvitesForPetQuery(
  petId: string | null | undefined,
): UseQueryResult<CoCarerInvite[], Error> {
  return useQuery({
    queryKey: sentInvitesForPetKey(petId ?? ""),
    queryFn: () => fetchSentInvitesForPet(petId!),
    enabled: !!petId,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export type PendingInviteRow = CoCarerInvite & {
  pet_name?: string;
  inviter_name?: string;
};

export function usePendingInvitesQuery(): UseQueryResult<
  PendingInviteRow[],
  Error
> {
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useQuery({
    queryKey: pendingInvitesKey(userId ?? ""),
    queryFn: () => fetchPendingInvitesForUser(userId!),
    enabled: !!userId,
  });
}

export function useUserPetPermissionsQuery(
  petId: string | null | undefined,
): UseQueryResult<
  { role: "owner" | "co_carer"; permissions: CoCarePermissions },
  Error
> {
  const userId = useAuthStore((s) => s.session?.user?.id);

  const query = useQuery({
    queryKey: userPetPermissionsKey(petId ?? "", userId ?? ""),
    queryFn: () => fetchUserPermissionsForPet(petId!, userId!),
    enabled: !!petId && !!userId,
    /** Permissions change when the owner updates co-care; default 5m stale time hid updates. */
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  /** When the primary caretaker updates `pet_co_carers`, refetch on the co-carer's device. */
  useEffect(() => {
    if (!petId || !userId) return;

    const channel = supabase
      .channel(`pet_co_carers:${petId}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pet_co_carers",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const rowPetId =
            (payload.new as { pet_id?: string } | null)?.pet_id ??
            (payload.old as { pet_id?: string } | null)?.pet_id;
          if (rowPetId !== petId) return;
          void queryClient.invalidateQueries({
            queryKey: userPetPermissionsKey(petId, userId),
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [petId, userId]);

  return query;
}
