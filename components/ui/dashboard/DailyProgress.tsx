import { getDailyProgressRingIcons } from "@/constants/activityTypeProgressIcons";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { DailyProgressCategory } from "@/types/ui";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import ProgressRing from "./ProgressRing";

type DailyProgressProps = {
  categories: DailyProgressCategory[];
  /** Active pet species — cats use the play/exercise toy icon on the exercise ring. */
  petType?: string | null;
  /** All categories with goals satisfied — unified green rings + celebratory styling. */
  allComplete?: boolean;
};

const RING_SIZE = 68;
const STROKE_WIDTH = 8;

/** Progress rings only — parent supplies the section label and card chrome. */
export default function DailyProgress({
  categories,
  petType = null,
  allComplete = false,
}: DailyProgressProps) {
  const ringIcons = useMemo(
    () => getDailyProgressRingIcons(petType),
    [petType],
  );

  return (
    <View style={styles.row}>
      {categories.map((cat) => {
        const progress = cat.total > 0 ? cat.current / cat.total : 0;
        const iconSource = ringIcons[cat.id];
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
              {iconSource ? (
                <Image source={iconSource} style={styles.icon} />
              ) : null}
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
