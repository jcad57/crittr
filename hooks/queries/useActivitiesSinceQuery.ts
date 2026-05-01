import { activitiesSinceKey } from "@/hooks/queries/queryKeys";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { fetchActivitiesSince } from "@/services/activities";
import type { PetActivity } from "@/types/database";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";

export function useActivitiesSinceQuery(
  petId: string | null | undefined,
  sinceIso: string | null | undefined,
  enabled: boolean,
): UseQueryResult<PetActivity[], Error> {
  const localYmd = useLocalCalendarYmd();
  const pid = petId ?? "";
  const since = sinceIso ?? "";
  return useQuery<PetActivity[], Error>({
    queryKey: [...activitiesSinceKey(pid, since), localYmd],
    queryFn: () => fetchActivitiesSince(pid, since),
    enabled: !!petId && !!sinceIso && enabled,
  });
}
