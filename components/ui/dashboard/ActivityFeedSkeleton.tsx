import { ACTIVITY_ROW_ICON_BOX } from "@/constants/activityRowIcons";
import { Colors } from "@/constants/colors";
import { useSkeletonPulse } from "@/hooks/useSkeletonPulse";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import SectionLabel from "./SectionLabel";

const ROW_COUNT = 4;
const GAP = 8;

function SkeletonActivityRow({
  pulseStyle,
}: {
  pulseStyle: AnimatedStyle<ViewStyle>;
}) {
  return (
    <View style={styles.card}>
      <Animated.View
        style={[styles.iconSkel, pulseStyle]}
      />
      <View style={styles.body}>
        <Animated.View style={[styles.titleBar, pulseStyle]} />
        <Animated.View style={[styles.subBar, pulseStyle]} />
      </View>
      <View style={styles.rightCol}>
        <Animated.View style={[styles.rightBarTop, pulseStyle]} />
        <Animated.View style={[styles.rightBarBottom, pulseStyle]} />
      </View>
    </View>
  );
}

export default function ActivityFeedSkeleton() {
  const pulseStyle = useSkeletonPulse();

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <SectionLabel style={styles.sectionLabelFlush}>
          Today&apos;s Activity
        </SectionLabel>
      </View>

      <View style={styles.rows}>
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <SkeletonActivityRow key={i} pulseStyle={pulseStyle} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  listHeader: {
    marginBottom: 8,
  },
  sectionLabelFlush: {
    marginBottom: 0,
  },
  rows: {
    gap: GAP,
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
  titleBar: {
    height: 14,
    borderRadius: 6,
    backgroundColor: Colors.gray200,
    width: "72%",
    maxWidth: 220,
  },
  subBar: {
    height: 11,
    borderRadius: 5,
    backgroundColor: Colors.gray200,
    width: "42%",
    maxWidth: 120,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  rightBarTop: {
    height: 12,
    borderRadius: 5,
    backgroundColor: Colors.gray200,
    width: 44,
  },
  rightBarBottom: {
    height: 11,
    borderRadius: 5,
    backgroundColor: Colors.gray200,
    width: 52,
  },
});
