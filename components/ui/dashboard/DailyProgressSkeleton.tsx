import { createThemeValues, useThemeValues } from "@/theme/colors";
import { useSkeletonPulse } from "@/hooks/useSkeletonPulse";
import { useDailyProgressLayout } from "@/hooks/useDailyProgressLayout";
import type { dailyProgressLayout } from "@/utils/dailyProgressLayout";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";

function SkeletonRingColumn({
  pulseStyle,
  compact = false,
  layout,
}: {
  pulseStyle: AnimatedStyle<ViewStyle>;
  compact?: boolean;
  layout: ReturnType<typeof dailyProgressLayout>;
}) {
  const styles = useThemeValues(getStyles);
  return (
    <View style={[styles.item, { gap: layout.itemGap }]}>
      <Animated.View style={[styles.ring, compact && styles.compactRing, { width: layout.ringSize, height: layout.ringSize, borderRadius: layout.ringSize / 2, ...(compact ? { borderWidth: layout.strokeWidth } : {}) }, pulseStyle]} />
      {!compact && <Animated.View style={[styles.labelBar, { width: Math.min(52, layout.columnWidth * 0.9) }, pulseStyle]} />}
      {!compact && <Animated.View style={[styles.fractionBar, { width: Math.min(36, layout.columnWidth * 0.75) }, pulseStyle]} />}
    </View>
  );
}

/** Matches the active pet's four/five-column progress layout. */
export default function DailyProgressSkeleton({ compact = false, count = 4 }: { compact?: boolean; count?: number }) {
  const styles = useThemeValues(getStyles);
  const pulseStyle = useSkeletonPulse();
  const { layout, onLayout, measured } = useDailyProgressLayout(count, compact);

  return (
    <View onLayout={onLayout} style={[styles.row, compact && styles.compactRow, { gap: layout.gap, opacity: measured ? 1 : 0 }]}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRingColumn key={i} pulseStyle={pulseStyle} compact={compact} layout={layout} />
      ))}
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
  compactRing: {
    borderColor: Colors.gray200,
    backgroundColor: "transparent",
  },
  ring: {
    backgroundColor: Colors.gray200,
  },
  labelBar: {
    height: 11,
    borderRadius: 5,
    backgroundColor: Colors.gray200,
    marginTop: 2,
  },
  fractionBar: {
    height: 13,
    borderRadius: 5,
    backgroundColor: Colors.gray200,
  },
}));
