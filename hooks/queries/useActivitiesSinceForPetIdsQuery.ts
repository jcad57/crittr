import { activitiesSinceForPetIdsKey } from "@/hooks/queries/queryKeys";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { fetchActivitiesSinceForPetIds } from "@/services/activities";
import type { PetActivity } from "@/types/database";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";

export function useActivitiesSinceForPetIdsQuery(
  petIds: string[],
  sinceIso: string | null | undefined,
  enabled: boolean,
): UseQueryResult<PetActivity[], Error> {
  const localYmd = useLocalCalendarYmd();
  const since = sinceIso ?? "";
  return useQuery<PetActivity[], Error>({
    queryKey: [...activitiesSinceForPetIdsKey(petIds, since), localYmd],
    queryFn: () => fetchActivitiesSinceForPetIds([...petIds], since),
    enabled: petIds.length > 0 && !!sinceIso && enabled,
  });
}
