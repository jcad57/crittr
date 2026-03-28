import { Colors } from "@/constants/colors";
import type { ActivityDisplayCategory } from "@/data/activityHistory";

/** Shared with Activity tab rows and dashboard activity feed — same assets and ring/track colors. */
export const ACTIVITY_ROW_ICONS: Record<
  ActivityDisplayCategory,
  { source: number; ring: string; track: string }
> = {
  exercise: {
    source: require("@/assets/icons/walk-dog-icon.png"),
    ring: Colors.progressExercise,
    track: Colors.progressExerciseTrack,
  },
  meals: {
    source: require("@/assets/icons/food-icon.png"),
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
};

export const ACTIVITY_ROW_ICON_BOX = 48;
export const ACTIVITY_ROW_ICON_IMG = 26;
