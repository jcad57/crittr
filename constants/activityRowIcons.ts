import {
  ACTIVITY_TYPE_LOG_ICONS,
  EXERCISE_ACTIVITY_ICON_DOG,
  getExerciseActivityIcon,
  MEALS_ACTIVITY_ICON_DOG,
  getMealsActivityIcon,
} from "@/constants/activityTypeProgressIcons";
import { Colors } from "@/constants/colors";
import type { ActivityDisplayCategory } from "@/data/activityHistory";
import type { ImageSource } from "expo-image";

/** Shared with Activity tab rows and dashboard activity feed — same assets and ring/track colors. */
export const ACTIVITY_ROW_ICONS: Record<
  ActivityDisplayCategory,
  { source: ImageSource; ring: string; track: string }
> = {
  exercise: {
    source: EXERCISE_ACTIVITY_ICON_DOG,
    ring: Colors.progressExercise,
    track: Colors.progressExerciseTrack,
  },
  meals: {
    source: MEALS_ACTIVITY_ICON_DOG,
    ring: Colors.progressMeals,
    track: Colors.progressMealsTrack,
  },
  treats: {
    source: require("@/assets/icons/dog-bone-icon.png"),
    ring: Colors.progressTreats,
    track: Colors.progressTreatsTrack,
  },
  meds: {
    source: require("@/assets/icons/medicine-icon.png"),
    ring: Colors.progressMeds,
    track: Colors.progressMedsTrack,
  },
  vet_visit: {
    source: require("@/assets/icons/health-paw-icon.png"),
    ring: Colors.progressTreats,
    track: Colors.progressTreatsTrack,
  },
  training: {
    source: EXERCISE_ACTIVITY_ICON_DOG,
    ring: Colors.progressExercise,
    track: Colors.progressExerciseTrack,
  },
  potty: {
    source: require("@/assets/icons/dog-bone-icon.png"),
    ring: Colors.progressTreats,
    track: Colors.progressTreatsTrack,
  },
  maintenance: {
    source: ACTIVITY_TYPE_LOG_ICONS.maintenance,
    ring: Colors.progressTreats,
    track: Colors.progressTreatsTrack,
  },
};

/** Row icon PNG — cats use toy for exercise and bowl for meals; maintenance matches {@link ACTIVITY_TYPE_LOG_ICONS}. */
export function resolveActivityRowIconSource(
  category: ActivityDisplayCategory,
  petType: string | null | undefined,
): ImageSource {
  if (category === "exercise") {
    return getExerciseActivityIcon(petType);
  }
  if (category === "meals") {
    return getMealsActivityIcon(petType);
  }
  if (category === "maintenance") {
    return ACTIVITY_TYPE_LOG_ICONS.maintenance;
  }
  return ACTIVITY_ROW_ICONS[category].source;
}

export const ACTIVITY_ROW_ICON_BOX = 48;
export const ACTIVITY_ROW_ICON_IMG = 26;
