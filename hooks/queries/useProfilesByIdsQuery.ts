import { fetchProfilesByIds } from "@/services/profiles";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { profilesByIdsQueryKey } from "./queryKeys";

export function useProfilesByIdsQuery(userIds: string[]) {
  const sortedIds = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort(),
    [userIds],
  );

  return useQuery({
    queryKey: profilesByIdsQueryKey(sortedIds),
    queryFn: () => fetchProfilesByIds(sortedIds),
    enabled: sortedIds.length > 0,
  });
}
