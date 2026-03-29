import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { DailyProgressCategory } from "@/data/mockDashboard";
import { Image, ImageSource } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import ProgressRing from "./ProgressRing";

// Category ID → icon asset. Kept here so the data model stays plain.
const CATEGORY_ICONS: Record<string, ImageSource> = {
  exercise: require("@/assets/icons/walk-dog-icon.png"),
  meals: require("@/assets/icons/food-icon.png"),
  treats: require("@/assets/icons/dog-bone-icon.png"),
  meds: require("@/assets/icons/medicine-icon.png"),
};

type DailyProgressProps = {
  categories: DailyProgressCategory[];
  /** All categories with goals satisfied — unified green rings + celebratory styling. */
  allComplete?: boolean;
};

const RING_SIZE = 68;
const STROKE_WIDTH = 8;

/** Progress rings only — parent supplies the section label and card chrome. */
export default function DailyProgress({
  categories,
  allComplete = false,
}: DailyProgressProps) {
  return (
    <View style={styles.row}>
      {categories.map((cat) => {
        const progress = cat.total > 0 ? cat.current / cat.total : 0;
        const iconSource = CATEGORY_ICONS[cat.id];
        const targetMet = cat.total > 0 && cat.current >= cat.total;
        const ringColor = allComplete
          ? Colors.progressCompleteRing
          : cat.ringColor;
        const trackColor = allComplete
          ? Colors.progressCompleteTrack
          : cat.trackColor;
        return (
          <View key={cat.id} style={styles.item}>
            <ProgressRing
              size={RING_SIZE}
              strokeWidth={STROKE_WIDTH}
              progress={progress}
              color={ringColor}
              trackColor={trackColor}
            >
              {iconSource && <Image source={iconSource} style={styles.icon} />}
            </ProgressRing>
            <Text
              style={[
                styles.label,
                allComplete && styles.labelAllComplete,
              ]}
            >
              {cat.label}
            </Text>
            <Text
              style={[
                styles.fraction,
                allComplete
                  ? styles.fractionAllComplete
                  : targetMet
                    ? styles.fractionComplete
                    : styles.fractionIncomplete,
              ]}
            >
              {cat.current}/{cat.total}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: {
    alignItems: "center",
    gap: 6,
  },
  icon: {
    width: 26,
    height: 26,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  labelAllComplete: {
    color: Colors.successDark,
  },
  fraction: {
    fontSize: 14,
  },
  /** Progress still open — muted numerator/denominator. */
  fractionIncomplete: {
    fontFamily: Font.uiRegular,
    color: Colors.textPrimary,
  },
  /** Target reached (e.g. all meals logged) — emphasize the count. */
  fractionComplete: {
    fontFamily: Font.uiBold,
    color: Colors.textPrimary,
  },
  /** Entire card completed — counts match ring green. */
  fractionAllComplete: {
    fontFamily: Font.uiBold,
    color: Colors.successDark,
  },
});
