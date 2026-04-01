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
  return useQuery({
    queryKey: userPetPermissionsKey(petId ?? "", userId ?? ""),
    queryFn: () => fetchUserPermissionsForPet(petId!, userId!),
    enabled: !!petId && !!userId,
  });
}
