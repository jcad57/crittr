import { createThemeValues } from "./colors";

/** Progress ring inks share the seasonal palette and retain the original summer colors. */
export const getDashboardProgressColors = createThemeValues((colors): Record<string, string> => ({
  exercise: colors.dashboardExercise,
  meals: colors.dashboardMeals,
  treats: colors.dashboardTreats,
  meds: colors.dashboardMeds,
  maintenance: colors.dashboardMaintenance,
  potty: colors.progressTraining,
}));
