import { Colors } from "@/constants/colors";
import { useSkeletonPulse } from "@/hooks/useSkeletonPulse";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";

const RING_SIZE = 68;
const PLACEHOLDER_COUNT = 4;

function SkeletonRingColumn({
  pulseStyle,
}: {
  pulseStyle: AnimatedStyle<ViewStyle>;
}) {
  return (
    <View style={styles.item}>
      <Animated.View style={[styles.ring, pulseStyle]} />
      <Animated.View style={[styles.labelBar, pulseStyle]} />
      <Animated.View style={[styles.fractionBar, pulseStyle]} />
    </View>
  );
}

/** Matches {@link DailyProgress} layout: four ring columns with label + fraction lines. */
export default function DailyProgressSkeleton() {
  const pulseStyle = useSkeletonPulse();

  return (
    <View style={styles.row}>
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
        <SkeletonRingColumn key={i} pulseStyle={pulseStyle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  item: {
    alignItems: "center",
    gap: 6,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    backgroundColor: Colors.gray200,
  },
  labelBar: {
    height: 11,
    borderRadius: 5,
    width: 52,
    backgroundColor: Colors.gray200,
    marginTop: 2,
  },
  fractionBar: {
    height: 13,
    borderRadius: 5,
    width: 36,
    backgroundColor: Colors.gray200,
  },
});
