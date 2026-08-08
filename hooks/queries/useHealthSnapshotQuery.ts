import { queryClient } from "@/lib/queryClient";
import { fetchOwnerHealthSnapshot } from "@/services/health";
import type { OwnerHealthSnapshot } from "@/services/health";
import { useAuthStore } from "@/stores/authStore";
import type { PetWithRole } from "@/types/database";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { healthSnapshotKey, petsQueryKey } from "./queryKeys";

/**
 * Reuse the pets list the app has already loaded rather than making the health
 * snapshot fetch its own copy — it is the same two requests either way.
 */
export function fetchHealthSnapshotUsingCachedPets(
  userId: string,
): Promise<OwnerHealthSnapshot> {
  const cachedPets = queryClient.getQueryData<PetWithRole[]>(
    petsQueryKey(userId),
  );
  return fetchOwnerHealthSnapshot(userId, cachedPets);
}

export function useHealthSnapshotQuery(): UseQueryResult<
  OwnerHealthSnapshot,
  Error
> {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery({
    queryKey: healthSnapshotKey(userId ?? ""),
    queryFn: () => fetchHealthSnapshotUsingCachedPets(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
