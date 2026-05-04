import {
  activitiesSinceForPetIdsPrefixKey,
  profileQueryKey,
  petDetailsQueryKey,
  todayActivitiesForPetIdsPrefixKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import { updateProfile } from "@/services/profiles";
import type { LitterCleaningPeriod } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

export type UpdateHouseholdLitterInput = {
  litter_cleaning_period: LitterCleaningPeriod;
  litter_cleanings_per_period: number;
};

/**
 * Household litter goals on `profiles` (all cats). Optionally refreshes pet details
 * so `household_litter_*` from RPC stays consistent.
 */
export function useProfileLitterMaintenanceMutation(opts: {
  activePetId?: string | null;
  householdCatPetIds?: string[];
}) {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { activePetId, householdCatPetIds = [] } = opts;

  return useMutation({
    mutationFn: (fields: UpdateHouseholdLitterInput) => {
      if (!userId) throw new Error("Not signed in");
      return updateProfile(userId, {
        litter_cleaning_period: fields.litter_cleaning_period,
        litter_cleanings_per_period: fields.litter_cleanings_per_period,
      });
    },
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        });
      }
      const ids = new Set<string>();
      if (activePetId) ids.add(activePetId);
      for (const id of householdCatPetIds) ids.add(id);
      for (const id of ids) {
        void queryClient.invalidateQueries({
          queryKey: petDetailsQueryKey(id),
        });
      }
      if (householdCatPetIds.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: activitiesSinceForPetIdsPrefixKey(householdCatPetIds),
        });
        void queryClient.invalidateQueries({
          queryKey: todayActivitiesForPetIdsPrefixKey(householdCatPetIds),
        });
      }
    },
  });
}
