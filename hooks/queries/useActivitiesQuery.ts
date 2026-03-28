import {
  fetchActivitiesForPet,
  fetchActivityById,
  fetchTodayActivities,
  fetchTodayActivitiesForPetIds,
} from "@/services/activities";
import type { PetActivity } from "@/types/database";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import {
  allActivitiesKey,
  petActivityQueryKey,
  todayActivitiesForPetIdsKey,
  todayActivitiesKey,
} from "./queryKeys";

export function useTodayActivitiesQuery(
  petId: string | null | undefined,
): UseQueryResult<PetActivity[], Error> {
  return useQuery<PetActivity[], Error>({
    queryKey: todayActivitiesKey(petId ?? ""),
    queryFn: () => fetchTodayActivities(petId!),
    enabled: !!petId,
  });
}

export function useAllActivitiesQuery(
  petId: string | null | undefined,
): UseQueryResult<PetActivity[], Error> {
  return useQuery<PetActivity[], Error>({
    queryKey: allActivitiesKey(petId ?? ""),
    queryFn: () => fetchActivitiesForPet(petId!),
    enabled: !!petId,
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
  return useQuery<PetActivity[], Error>({
    queryKey: todayActivitiesForPetIdsKey(petIds),
    queryFn: () => fetchTodayActivitiesForPetIds([...petIds]),
    enabled: petIds.length > 0,
  });
}
