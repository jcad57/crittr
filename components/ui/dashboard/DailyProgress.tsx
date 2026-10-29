import { getDashboardProgressColors } from "@/theme/dashboardProgressColors";
import { getDailyProgressRingIcons } from "@/constants/activityTypeProgressIcons";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import type { DailyProgressCategory } from "@/types/ui";
import { Image } from "expo-image";
import { useDailyProgressLayout } from "@/hooks/useDailyProgressLayout";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import ProgressRing from "./ProgressRing";

type DailyProgressProps = {
  categories: DailyProgressCategory[];
  /** Active pet species — cats use the play/exercise toy icon on the exercise ring. */
  petType?: string | null;
  /** All categories with goals satisfied — celebratory label styling. */
  allComplete?: boolean;
  /** Changes with active pet so rings replay from 0 on each switch. */
  animationKey?: string;
  /** Small rings only, for the collapsed card header. */
  compact?: boolean;
};

/** Progress rings only — parent supplies the section label and card chrome. */
export default function DailyProgress({
  categories,
  petType = null,
  allComplete = false,
  animationKey,
  compact = false,
}: DailyProgressProps) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const ringColors = useThemeValues(getDashboardProgressColors);
  const { layout, onLayout, measured } = useDailyProgressLayout(categories.length, compact);
  const ringIcons = useMemo(
    () => getDailyProgressRingIcons(petType),
    [petType],
  );

  return (
    <View onLayout={onLayout} style={[styles.row, compact && styles.compactRow, { gap: layout.gap, opacity: measured ? 1 : 0 }]}>
      {categories.map((cat) => {
        const notTracked = cat.total <= 0;
        const progress = cat.total > 0 ? cat.current / cat.total : 0;
        const iconSource = ringIcons[cat.id];
        const targetMet = cat.total > 0 && cat.current >= cat.total;
        const ringColor = targetMet
          ? Colors.progressCompleteRing
          : ringColors[cat.id] ?? cat.ringColor;
        const trackColor = targetMet
          ? Colors.progressCompleteTrack
          : Colors.dashboardTrack;
        return (
          <View
            key={cat.id}
            style={[styles.item, { gap: layout.itemGap }, notTracked && styles.itemNotTracked]}
            accessible
            accessibilityLabel={notTracked ? `${cat.label}, not tracked` : `${cat.label}, ${cat.current} of ${cat.total}`}
          >
            {layout.ringSize > 0 && <ProgressRing
              size={layout.ringSize}
              strokeWidth={layout.strokeWidth}
              progress={progress}
              color={ringColor}
              trackColor={trackColor}
              animationKey={animationKey}
            >
              {!compact && iconSource ? (
                <Image source={iconSource} style={{ width: layout.iconSize, height: layout.iconSize }} />
              ) : null}
            </ProgressRing>}
            {!compact && (
              <>
                <Text
                  style={[
                    styles.label,
                    { fontSize: layout.labelSize, lineHeight: Math.ceil(layout.labelSize * 1.45) },
                    allComplete && !notTracked && styles.labelAllComplete,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {cat.label}
                </Text>
                <Text
                  style={[
                    styles.fraction,
                    { fontSize: layout.fractionSize, lineHeight: Math.ceil(layout.fractionSize * 1.4) },
                    allComplete && !notTracked
                      ? styles.fractionAllComplete
                      : targetMet
                        ? styles.fractionComplete
                        : styles.fractionIncomplete,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {cat.current}/{cat.total}
                </Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  compactRow: {
    flex: 1,
    alignItems: "center",
  },
  itemNotTracked: {
    opacity: 0.42,
  },
  label: {
    width: "100%",
    textAlign: "center",
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  labelAllComplete: {
    color: Colors.progressCompleteRing,
  },
  fraction: {
    width: "100%",
    textAlign: "center",
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
    color: Colors.progressCompleteRing,
  },
  /** Entire card completed — counts match ring green. */
  fractionAllComplete: {
    fontFamily: Font.uiBold,
    color: Colors.progressCompleteRing,
  },
}));
