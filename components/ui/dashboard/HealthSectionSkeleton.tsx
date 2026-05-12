import HealthListCard from "@/components/ui/health/HealthListCard";
import { Colors } from "@/constants/colors";
import { useSkeletonPulse } from "@/hooks/useSkeletonPulse";
import { StyleSheet, View, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";
import SectionLabel from "./SectionLabel";

const MED_ROW_COUNT = 2;

function SkeletonMedRow({
  pulseStyle,
  isLast,
}: {
  pulseStyle: AnimatedStyle<ViewStyle>;
  isLast: boolean;
}) {
  return (
    <View style={[styles.medRowWrap, !isLast && styles.medRowBorder]}>
      <View style={styles.medRowMain}>
        <Animated.View style={[styles.medIcon, pulseStyle]} />
        <View style={styles.medMid}>
          <Animated.View style={[styles.medTitleBar, pulseStyle]} />
          <Animated.View style={[styles.medSubBar, pulseStyle]} />
        </View>
        <Animated.View style={[styles.medBadge, pulseStyle]} />
        <Animated.View style={[styles.chevronBar, pulseStyle]} />
      </View>
    </View>
  );
}

function SkeletonVisitRow({ pulseStyle }: { pulseStyle: AnimatedStyle<ViewStyle> }) {
  return (
    <View style={styles.visitRowWrap}>
      <View style={styles.visitRowMain}>
        <Animated.View style={[styles.visitIcon, pulseStyle]} />
        <View style={styles.visitMid}>
          <Animated.View style={[styles.visitTitleBar, pulseStyle]} />
          <Animated.View style={[styles.visitSubBar, pulseStyle]} />
        </View>
        <Animated.View style={[styles.visitChevron, pulseStyle]} />
      </View>
    </View>
  );
}

/** Mirrors {@link HealthSection}: medications list + vet visits in a health-style list card. */
export default function HealthSectionSkeleton() {
  const pulseStyle = useSkeletonPulse();

  return (
    <View style={styles.container}>
      <SectionLabel>Current Medications</SectionLabel>

      <HealthListCard>
        {Array.from({ length: MED_ROW_COUNT }, (_, i) => (
          <SkeletonMedRow
            key={i}
            pulseStyle={pulseStyle}
            isLast={i === MED_ROW_COUNT - 1}
          />
        ))}
      </HealthListCard>

      <SectionLabel style={styles.visitsLabel}>Upcoming vet visits</SectionLabel>
      <HealthListCard>
        <SkeletonVisitRow pulseStyle={pulseStyle} />
      </HealthListCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  visitsLabel: {
    marginTop: 20,
  },
  medRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
  },
  medRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  medRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 12,
    gap: 10,
    minWidth: 0,
  },
  medIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.gray200,
  },
  medMid: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  medTitleBar: {
    height: 15,
    borderRadius: 6,
    width: "78%",
    maxWidth: 200,
    backgroundColor: Colors.gray200,
  },
  medSubBar: {
    height: 12,
    borderRadius: 5,
    width: "55%",
    maxWidth: 160,
    backgroundColor: Colors.gray200,
  },
  medBadge: {
    width: 52,
    height: 26,
    borderRadius: 999,
    backgroundColor: Colors.gray200,
  },
  chevronBar: {
    width: 10,
    height: 22,
    borderRadius: 3,
    backgroundColor: Colors.gray200,
  },
  visitRowWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
  },
  visitRowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 12,
    gap: 10,
    minWidth: 0,
  },
  visitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.gray200,
  },
  visitMid: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  visitTitleBar: {
    height: 15,
    borderRadius: 6,
    width: "70%",
    maxWidth: 200,
    backgroundColor: Colors.gray200,
  },
  visitSubBar: {
    height: 12,
    borderRadius: 5,
    width: "85%",
    maxWidth: 240,
    backgroundColor: Colors.gray200,
  },
  visitChevron: {
    width: 10,
    height: 22,
    borderRadius: 3,
    backgroundColor: Colors.gray200,
  },
});
