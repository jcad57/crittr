import { ACTIVITY_ROW_ICON_BOX } from "@/constants/activityRowIcons";
import { Colors } from "@/theme/colors";
import { useSkeletonPulse } from "@/hooks/useSkeletonPulse";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";

const CHECK_SIZE = 32;

/** Roughly a morning + afternoon worth of rows, so the scroll height barely moves. */
const SECTIONS = [
  { key: "morning", rows: 3 },
  { key: "afternoon", rows: 2 },
];

function SkeletonCard({ pulseStyle }: { pulseStyle: AnimatedStyle<ViewStyle> }) {
  return (
    <View style={styles.card}>
      <Animated.View style={[styles.iconSkel, pulseStyle]} />
      <View style={styles.body}>
        <Animated.View style={[styles.labelBar, pulseStyle]} />
        <Animated.View style={[styles.detailBar, pulseStyle]} />
      </View>
      <Animated.View style={[styles.checkSkel, pulseStyle]} />
    </View>
  );
}

/**
 * Placeholder for a schedule day that isn't cached yet.
 *
 * A centred spinner collapsed the list to nothing and then re-expanded it,
 * which read as a much longer wait than it was — especially when switching
 * pets, where the surrounding chrome never changes.
 */
export default function ScheduleDaySkeleton() {
  const pulseStyle = useSkeletonPulse();

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading schedule"
    >
      {SECTIONS.map((section) => (
        <View key={section.key} style={styles.section}>
          <Animated.View style={[styles.titleBar, pulseStyle]} />
          <View style={styles.list}>
            {Array.from({ length: section.rows }, (_, i) => (
              <SkeletonCard key={i} pulseStyle={pulseStyle} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 22,
    paddingTop: 10,
  },
  section: {
    gap: 12,
  },
  titleBar: {
    height: 22,
    width: 116,
    borderRadius: 7,
    backgroundColor: Colors.gray200,
  },
  list: {
    gap: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  iconSkel: {
    width: ACTIVITY_ROW_ICON_BOX,
    height: ACTIVITY_ROW_ICON_BOX,
    borderRadius: 12,
    backgroundColor: Colors.gray200,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  labelBar: {
    height: 14,
    width: "68%",
    maxWidth: 200,
    borderRadius: 6,
    backgroundColor: Colors.gray200,
  },
  detailBar: {
    height: 11,
    width: "40%",
    maxWidth: 118,
    borderRadius: 5,
    backgroundColor: Colors.gray200,
  },
  checkSkel: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    backgroundColor: Colors.gray200,
    flexShrink: 0,
  },
});
