import { activityMonthCountKey } from "@/lib/query/keys";
import { fetchActivityCountSince } from "@/services/activities";
import {
  localMonthKey,
  startOfLocalMonthIso,
} from "@/utils/activityMilestones";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

/**
 * Head-only monthly activity count for one pet. Cheap enough to evaluate after
 * the dashboard is on screen; does not pull activity rows.
 */
export function useActivityMonthCountQuery(
  petId: string | null | undefined,
  enabled: boolean,
): UseQueryResult<number, Error> {
  const monthKey = localMonthKey();
  const sinceIso = startOfLocalMonthIso();
  const pid = petId ?? "";

  return useQuery<number, Error>({
    queryKey: activityMonthCountKey(pid, monthKey),
    queryFn: () => fetchActivityCountSince(pid, sinceIso),
    enabled: !!petId && enabled,
    staleTime: 1000 * 60 * 5,
  });
}
