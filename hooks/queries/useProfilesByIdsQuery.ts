import { fetchProfilesByIds } from "@/services/profiles";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
    /** Names and avatars of co-carers; they effectively never change mid-session. */
    staleTime: 10 * 60 * 1000,
    /**
     * Paging further into activity history can introduce a new logger, which
     * changes the key. Holding the previous result keeps already-resolved names
     * on screen instead of flashing them back to a placeholder.
     */
    placeholderData: keepPreviousData,
  });
}
