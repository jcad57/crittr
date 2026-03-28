import { fetchOwnerHealthSnapshot } from "@/services/health";
import type { OwnerHealthSnapshot } from "@/services/health";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { healthSnapshotKey } from "./queryKeys";

export function useHealthSnapshotQuery(): UseQueryResult<
  OwnerHealthSnapshot,
  Error
> {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery({
    queryKey: healthSnapshotKey(userId ?? ""),
    queryFn: () => fetchOwnerHealthSnapshot(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
