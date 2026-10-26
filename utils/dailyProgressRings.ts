import { Colors } from "@/theme/colors";
import type { PetActivity, PetWithDetails } from "@/types/database";
import type { DailyProgressCategory } from "@/types/ui";
import { dailyProgressExerciseTarget } from "@/utils/exercisePlans";
import { sumMedicationDoseProgress } from "@/utils/medicationDosageProgress";
import { dailyProgressFoodTarget, isTreatFood } from "@/utils/petFood";

type Input = {
  details: PetWithDetails | null;
  /** Today's activities for the active pet. */
  activities: PetActivity[];
  /** Today's activities across every cat in the household. */
  householdCatToday: PetActivity[];
  /**
   * Household cat activities over the current litter-cleaning period, used
   * instead of `householdCatToday` when that period is longer than a day.
   */
  householdMaintenanceWindow: PetActivity[];
  activePetId: string | null;
};

/**
 * The rings shown on the dashboard's daily progress card.
 *
 * Which rings appear depends on species: cats swap the treats ring for litter
 * maintenance, which is counted across the whole household rather than the one
 * pet, because a cleaned litter box serves every cat in it.
 */
export function buildDailyProgressRings({
  details,
  activities,
  householdCatToday,
  householdMaintenanceWindow,
  activePetId,
}: Input): DailyProgressCategory[] {
  const isCatProgress = details?.pet_type === "cat";

  const totalMeals = details
    ? details.foods
        .filter((f) => !isTreatFood(f))
        .reduce((sum, f) => sum + dailyProgressFoodTarget(f), 0)
    : 0;
  const totalTreats = details
    ? details.foods
        .filter((f) => isTreatFood(f))
        .reduce((sum, f) => sum + dailyProgressFoodTarget(f), 0)
    : 0;
  const totalExercise = details ? dailyProgressExerciseTarget(details) : 0;

  const medPetId = details?.id ?? activePetId ?? "";
  const medProgress =
    details && medPetId
      ? sumMedicationDoseProgress(details.medications, activities, medPetId)
      : { fulfilled: 0, expected: 0 };
  const hasMeds = (details?.medications.length ?? 0) > 0;

  const currentExercise = activities.filter(
    (a) => a.activity_type === "exercise",
  ).length;
  const currentMeals = activities.filter(
    (a) => a.activity_type === "food" && !a.is_treat,
  ).length;
  const currentTreats = activities.filter(
    (a) => a.activity_type === "food" && a.is_treat,
  ).length;

  const litterGoalPeriod = details?.household_litter_cleaning_period;
  const maintActsForHouseholdCats =
    isCatProgress && litterGoalPeriod && litterGoalPeriod !== "day"
      ? householdMaintenanceWindow
      : householdCatToday;
  const currentMaintenance =
    isCatProgress && litterGoalPeriod
      ? maintActsForHouseholdCats.filter(
          (a) => a.activity_type === "maintenance",
        ).length
      : 0;
  const totalMaintenance = Math.max(
    0,
    details?.household_litter_cleanings_per_period ?? 0,
  );

  const exerciseRing: DailyProgressCategory = {
    id: "exercise",
    label: "Exercise",
    icon: "run",
    current: currentExercise,
    total: totalExercise,
    ringColor: Colors.progressExercise,
    trackColor: Colors.progressExerciseTrack,
  };
  const mealsRing: DailyProgressCategory = {
    id: "meals",
    label: "Meals",
    icon: "food-drumstick",
    current: currentMeals,
    total: totalMeals,
    ringColor: Colors.progressMeals,
    trackColor: Colors.progressMealsTrack,
  };
  const medsRing: DailyProgressCategory = {
    id: "meds",
    label: "Meds",
    icon: "pill",
    current: medProgress.fulfilled,
    total: hasMeds ? medProgress.expected : 0,
    ringColor: Colors.progressMeds,
    trackColor: Colors.progressMedsTrack,
  };

  if (!isCatProgress) {
    return [
      exerciseRing,
      mealsRing,
      {
        id: "treats",
        label: "Treats",
        icon: "bone",
        current: currentTreats,
        total: totalTreats,
        ringColor: Colors.progressTreats,
        trackColor: Colors.progressTreatsTrack,
      },
      medsRing,
    ];
  }

  return [
    exerciseRing,
    mealsRing,
    {
      id: "maintenance",
      label: "Maintenance",
      icon: "broom",
      current: currentMaintenance,
      total: totalMaintenance,
      ringColor: Colors.progressTreats,
      trackColor: Colors.progressTreatsTrack,
    },
    medsRing,
  ];
}
