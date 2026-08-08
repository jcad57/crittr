import {
  activitiesSincePrefixKey,
  allActivitiesKey,
  scheduleDayKey,
  todayActivitiesPrefixKey,
} from "@/lib/query/keys";
import { queryClient } from "@/lib/query/client";
import {
  beginScheduleItemToggle,
  completeScheduleItem,
  endScheduleItemToggle,
  ensureScheduleForDay,
  resyncScheduleForward,
  SCHEDULE_STALE_MS,
  uncompleteScheduleItem,
  warmScheduleForPets,
} from "@/services/schedule";
import { useAuthStore } from "@/stores/authStore";
import type { PetScheduleItem } from "@/types/database";
import {
  useMutation,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useEffect } from "react";
import { InteractionManager } from "react-native";

export function useScheduleDayQuery(
  petId: string | null | undefined,
  localYmd: string | null | undefined,
): UseQueryResult<PetScheduleItem[], Error> {
  return useQuery<PetScheduleItem[], Error>({
    queryKey: scheduleDayKey(petId ?? "", localYmd ?? ""),
    queryFn: ({ signal }) =>
      ensureScheduleForDay(petId!, localYmd!, { signal }),
    enabled: !!petId && !!localYmd,
    /**
     * No cross-key placeholder on purpose. Showing the previous pet's rows
     * under a new pet's name invites tapping "complete" on the wrong animal;
     * `warmScheduleForPets` closes the gap instead.
     */
    staleTime: SCHEDULE_STALE_MS,
    refetchOnMount: true,
  });
}

const WARM_DEBOUNCE_MS = 350;

/**
 * Keep the non-selected pets warm for whichever day is on screen.
 * Debounced so scrubbing the date strip doesn't fan out a request per day.
 */
export function useWarmScheduleCache(petIds: string[], localYmd: string) {
  const petIdsKey = petIds.join(",");

  useEffect(() => {
    if (!petIdsKey || !localYmd) return;

    let cancelled = false;
    let interaction: { cancel: () => void } | null = null;

    const timer = setTimeout(() => {
      interaction = InteractionManager.runAfterInteractions(() => {
        if (cancelled) return;
        void warmScheduleForPets(petIdsKey.split(","), localYmd);
      });
    }, WARM_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      interaction?.cancel();
    };
  }, [petIdsKey, localYmd]);
}

/** Pull-to-refresh / manual reload: rebuild from the live profile. */
export async function refetchScheduleDayForced(
  petId: string,
  localYmd: string,
): Promise<PetScheduleItem[]> {
  return queryClient.fetchQuery({
    queryKey: scheduleDayKey(petId, localYmd),
    queryFn: ({ signal }) =>
      ensureScheduleForDay(petId, localYmd, { signal, force: true }),
    /**
     * `fetchQuery` inherits the client-wide 5 minute default, which made
     * pull-to-refresh resolve straight from cache and do nothing.
     */
    staleTime: 0,
  });
}

/** Activity history caches only — never invalidate schedule on toggle. */
function invalidateActivityCaches(petId: string) {
  void queryClient.invalidateQueries({
    queryKey: todayActivitiesPrefixKey(petId),
  });
  void queryClient.invalidateQueries({ queryKey: allActivitiesKey(petId) });
  void queryClient.invalidateQueries({
    queryKey: activitiesSincePrefixKey(petId),
  });
}

function patchScheduleItemInCache(item: PetScheduleItem) {
  const key = scheduleDayKey(item.pet_id, item.local_date);
  queryClient.setQueryData<PetScheduleItem[]>(key, (old) => {
    if (!old) return [item];
    let found = false;
    const next = old.map((row) => {
      if (row.id !== item.id) return row;
      found = true;
      return item;
    });
    return found ? next : [...next, item];
  });
}

type ToggleVars = { item: PetScheduleItem };

type ToggleContext = {
  previous: PetScheduleItem[] | undefined;
  key: ReturnType<typeof scheduleDayKey>;
  itemId: string;
};

export function useCompleteScheduleItemMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: ({ item }: ToggleVars) => {
      if (!userId) throw new Error("Not signed in");
      return completeScheduleItem(item.id, userId);
    },
    scope: { id: "schedule-item-toggle" },
    onMutate: async ({ item }): Promise<ToggleContext> => {
      const key = scheduleDayKey(item.pet_id, item.local_date);
      beginScheduleItemToggle(item.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PetScheduleItem[]>(key);
      const completedAt = new Date().toISOString();
      queryClient.setQueryData<PetScheduleItem[]>(key, (old) =>
        (old ?? []).map((row) =>
          row.id === item.id
            ? {
                ...row,
                completed_at: completedAt,
              }
            : row,
        ),
      );
      return { previous, key, itemId: item.id };
    },
    onError: (err, _vars, ctx) => {
      if (__DEV__) console.warn("[schedule] complete failed", err);
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSuccess: (data) => {
      patchScheduleItemInCache(data);
      invalidateActivityCaches(data.pet_id);
    },
    onSettled: (_data, _err, { item }) => {
      endScheduleItemToggle(item.id);
    },
  });
}

export function useUncompleteScheduleItemMutation() {
  return useMutation({
    mutationFn: ({ item }: ToggleVars) => uncompleteScheduleItem(item.id),
    scope: { id: "schedule-item-toggle" },
    onMutate: async ({ item }): Promise<ToggleContext> => {
      const key = scheduleDayKey(item.pet_id, item.local_date);
      beginScheduleItemToggle(item.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PetScheduleItem[]>(key);
      queryClient.setQueryData<PetScheduleItem[]>(key, (old) =>
        (old ?? []).map((row) =>
          row.id === item.id
            ? { ...row, completed_at: null, activity_id: null }
            : row,
        ),
      );
      return { previous, key, itemId: item.id };
    },
    onError: (err, _vars, ctx) => {
      if (__DEV__) console.warn("[schedule] uncomplete failed", err);
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
    },
    onSuccess: (data) => {
      patchScheduleItemInCache(data);
      invalidateActivityCaches(data.pet_id);
    },
    onSettled: (_data, _err, { item }) => {
      endScheduleItemToggle(item.id);
    },
  });
}

/** Call after food / med / exercise / vet profile changes. */
export function useResyncScheduleForwardMutation() {
  return useMutation({
    mutationFn: (petId: string) => resyncScheduleForward(petId),
  });
}

export function requestScheduleResync(petId: string) {
  void resyncScheduleForward(petId).catch((e) => {
    if (__DEV__) console.warn("[schedule] resync forward", e);
  });
}
