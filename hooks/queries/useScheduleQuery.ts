import { scheduleDayKey } from "@/lib/query/keys";
import { queryClient } from "@/lib/query/client";
import {
  beginScheduleItemToggle,
  endScheduleItemToggle,
  ensureScheduleForDay,
  isLatestScheduleItemToggle,
  resyncScheduleForward,
  SCHEDULE_STALE_MS,
  warmScheduleForPets,
} from "@/services/schedule";
import { syncScheduleItemCompletion } from "@/services/schedule/toggleCoordinator";
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

type ToggleVars = {
  item: PetScheduleItem;
  /** Desired completion after this tap. */
  completed: boolean;
  /** Set in `onMutate` so `mutationFn` registers the same generation. */
  generation?: number;
};

type ToggleContext = {
  previous: PetScheduleItem[] | undefined;
  key: ReturnType<typeof scheduleDayKey>;
  itemId: string;
  generation: number;
};

/**
 * Optimistic schedule complete/uncomplete. Each tap flips the cache immediately;
 * network work is coalesced per item so the server converges to the latest
 * intent without blocking re-taps on in-flight mutations.
 */
export function useToggleScheduleItemMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: ({ item, completed, generation }: ToggleVars) => {
      if (!userId) throw new Error("Not signed in");
      if (generation == null) {
        throw new Error("Missing toggle generation");
      }
      return syncScheduleItemCompletion({
        itemId: item.id,
        userId,
        petId: item.pet_id,
        completed,
        generation,
      });
    },
    onMutate: async (vars): Promise<ToggleContext> => {
      const { item, completed } = vars;
      const key = scheduleDayKey(item.pet_id, item.local_date);
      const generation = beginScheduleItemToggle(item.id);
      vars.generation = generation;

      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PetScheduleItem[]>(key);

      queryClient.setQueryData<PetScheduleItem[]>(key, (old) =>
        (old ?? []).map((row) => {
          if (row.id !== item.id) return row;
          if (completed) {
            return {
              ...row,
              completed_at: row.completed_at ?? new Date().toISOString(),
            };
          }
          return { ...row, completed_at: null, activity_id: null };
        }),
      );

      return { previous, key, itemId: item.id, generation };
    },
    onError: (err, _vars, ctx) => {
      if (__DEV__) console.warn("[schedule] toggle failed", err);
      /**
       * A newer tap already owns the row — restoring this snapshot would yank
       * the check back to a state the user has since left.
       */
      if (!ctx || !isLatestScheduleItemToggle(ctx.itemId, ctx.generation)) {
        return;
      }
      if (ctx.previous !== undefined) {
        queryClient.setQueryData(ctx.key, ctx.previous);
      }
      endScheduleItemToggle(ctx.itemId, ctx.generation);
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
