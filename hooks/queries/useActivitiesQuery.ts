import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import {
  fetchActivitiesForPet,
  fetchActivitiesForPetOnDay,
  fetchActivityById,
  fetchTodayActivities,
  fetchTodayActivitiesForPetIds,
} from "@/services/activities";
import type { PetActivity } from "@/types/database";
import {
  type UseQueryResult,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  activitiesOnDayKey,
  allActivitiesKey,
  petActivityQueryKey,
  todayActivitiesForPetIdsKey,
  todayActivitiesKey,
} from "./queryKeys";

export function useTodayActivitiesQuery(
  petId: string | null | undefined,
): UseQueryResult<PetActivity[], Error> {
  const localYmd = useLocalCalendarYmd();
  return useQuery<PetActivity[], Error>({
    queryKey: todayActivitiesKey(petId ?? "", localYmd),
    queryFn: () => fetchTodayActivities(petId!),
    enabled: !!petId,
  });
}

/**
 * Roughly two screens' worth of rows — enough that the common case never has to
 * page, small enough that the first render is not waiting on years of history.
 */
export const ACTIVITY_HISTORY_PAGE_SIZE = 100;

export type ActivityHistoryQuery = {
  data: PetActivity[] | undefined;
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

/**
 * A pet's activity history as a flat, newest-first list that grows as the user
 * scrolls. Callers get the same array shape as an ordinary query plus the
 * handles needed to drive `onEndReached`.
 */
export function useAllActivitiesQuery(
  petId: string | null | undefined,
): ActivityHistoryQuery {
  const query = useInfiniteQuery({
    queryKey: allActivitiesKey(petId ?? ""),
    queryFn: ({ pageParam }) =>
      fetchActivitiesForPet(petId!, {
        limit: ACTIVITY_HISTORY_PAGE_SIZE,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < ACTIVITY_HISTORY_PAGE_SIZE
        ? undefined
        : allPages.reduce((n, p) => n + p.length, 0),
    enabled: !!petId,
  });

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  const activities = useMemo(() => {
    if (!data) return undefined;
    /**
     * Offset paging can repeat a row if something is logged while the user is
     * scrolling; the list keys on activity id, so drop those here.
     */
    const seen = new Set<string>();
    const flat: PetActivity[] = [];
    for (const page of data.pages) {
      for (const activity of page) {
        if (seen.has(activity.id)) continue;
        seen.add(activity.id);
        flat.push(activity);
      }
    }
    return flat;
  }, [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    data: activities,
    isLoading: query.isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: loadMore,
  };
}

/** Backs the history date filter; independent of how far the user has paged. */
export function useActivitiesOnDayQuery(
  petId: string | null | undefined,
  localYmd: string | null,
): UseQueryResult<PetActivity[], Error> {
  return useQuery<PetActivity[], Error>({
    queryKey: activitiesOnDayKey(petId ?? "", localYmd ?? ""),
    queryFn: () => fetchActivitiesForPetOnDay(petId!, localYmd!),
    enabled: !!petId && !!localYmd,
  });
}

export function useActivityQuery(
  activityId: string | null | undefined,
): UseQueryResult<PetActivity | null, Error> {
  return useQuery<PetActivity | null, Error>({
    queryKey: petActivityQueryKey(activityId ?? ""),
    queryFn: () => fetchActivityById(activityId!),
    enabled: !!activityId,
  });
}

export function useTodayActivitiesForPetIdsQuery(
  petIds: string[],
): UseQueryResult<PetActivity[], Error> {
  const localYmd = useLocalCalendarYmd();
  return useQuery<PetActivity[], Error>({
    queryKey: todayActivitiesForPetIdsKey(petIds, localYmd),
    queryFn: () => fetchTodayActivitiesForPetIds([...petIds]),
    enabled: petIds.length > 0,
  });
}
