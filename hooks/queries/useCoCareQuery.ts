import {
  fetchCoCarersForPet,
  fetchPendingInvitesForUser,
  fetchSentInvitesForPet,
  fetchUserPermissionsForPet,
  type CoCarerWithProfile,
} from "@/services/coCare";
import { useAuthStore } from "@/stores/authStore";
import type { CoCarePermissions, CoCarerInvite } from "@/types/database";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
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
    /**
     * Permissions gate buttons on nearly every screen, so the default 5m stale
     * time hid co-care updates for too long. Realtime invalidation in
     * `useLoggedInQueryBootstrap` is what actually keeps this correct; a short
     * stale window bounds the damage if the socket drops, without refetching on
     * every single navigation the way `refetchOnMount: "always"` did.
     */
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  /**
   * Realtime: only one `postgres_changes` subscription per table is safe on hosted Supabase
   * (multiple channels → "mismatch between server and client bindings"). Co-care updates are
   * handled in `useLoggedInQueryBootstrap`, which invalidates `petPermissions` queries.
   */

  return query;
}
