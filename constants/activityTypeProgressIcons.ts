import type { ImageSource } from "expo-image";

export const EXERCISE_ACTIVITY_ICON_DOG = require("@/assets/icons/walk-dog-icon.png");
export const EXERCISE_ACTIVITY_ICON_CAT = require("@/assets/icons/cat-toy-icon.png");

/** Walk/run for dogs and most species; play for cats only (see {@link getExerciseActivityIcon}). */
export function getExerciseActivityIcon(
  petType: string | null | undefined,
): ImageSource {
  return petType === "cat" ? EXERCISE_ACTIVITY_ICON_CAT : EXERCISE_ACTIVITY_ICON_DOG;
}

export const MEALS_ACTIVITY_ICON_DOG = require("@/assets/icons/food-icon.png");
export const MEALS_ACTIVITY_ICON_CAT = require("@/assets/icons/cat-bowl-icon.png");

/** Standard bowl/trough for dogs and most species; cat bowl for cats only. */
export function getMealsActivityIcon(
  petType: string | null | undefined,
): ImageSource {
  return petType === "cat" ? MEALS_ACTIVITY_ICON_CAT : MEALS_ACTIVITY_ICON_DOG;
}

/**
 * PNG icons for the log-activity grid — aligned with daily progress ring assets
 * (exercise / meals / treats / meds / maintenance / weigh-in).
 */
export const ACTIVITY_TYPE_LOG_ICONS: Record<
  | "exercise"
  | "food"
  | "medication"
  | "training"
  | "potty"
  | "maintenance"
  | "weigh_in",
  ImageSource
> = {
  exercise: EXERCISE_ACTIVITY_ICON_DOG,
  food: MEALS_ACTIVITY_ICON_DOG,
  medication: require("@/assets/icons/medicine-icon.png"),
  training: EXERCISE_ACTIVITY_ICON_DOG,
  potty: require("@/assets/icons/dog-bone-icon.png"),
  maintenance: require("@/assets/icons/litter-box-icon.png"),
  weigh_in: require("@/assets/icons/weight-scale-icon.png"),
};

/** Daily progress ring icons by category `id` from `DailyProgressCategory`. */
export function getDailyProgressRingIcons(
  petType: string | null | undefined,
): Record<string, ImageSource> {
  return {
    exercise: getExerciseActivityIcon(petType),
    meals: getMealsActivityIcon(petType),
    treats: ACTIVITY_TYPE_LOG_ICONS.potty,
    meds: ACTIVITY_TYPE_LOG_ICONS.medication,
    maintenance: ACTIVITY_TYPE_LOG_ICONS.maintenance,
  };
}
