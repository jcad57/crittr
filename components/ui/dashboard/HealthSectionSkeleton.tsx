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

function SkeletonVisitFeatureCard({ pulseStyle }: { pulseStyle: AnimatedStyle<ViewStyle> }) {
  return (
    <View style={styles.visitCard}>
      <View style={styles.visitRow}>
        <Animated.View style={[styles.visitIcon, pulseStyle]} />
        <View style={styles.visitMid}>
          <Animated.View style={[styles.visitTitleBar, pulseStyle]} />
          <Animated.View style={[styles.visitSubBar, pulseStyle]} />
        </View>
        <Animated.View style={[styles.visitMonthBadge, pulseStyle]} />
        <Animated.View style={[styles.visitChevron, pulseStyle]} />
      </View>
    </View>
  );
}

/** Mirrors {@link HealthSection}: medications list + upcoming visit feature card. */
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
      <SkeletonVisitFeatureCard pulseStyle={pulseStyle} />
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
  visitCard: {
    borderRadius: 24,
    backgroundColor: Colors.featureDark,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  visitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.featureDarkElevated,
  },
  visitMid: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  visitTitleBar: {
    height: 17,
    borderRadius: 6,
    width: "72%",
    maxWidth: 220,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  visitSubBar: {
    height: 13,
    borderRadius: 5,
    width: "88%",
    maxWidth: 260,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  visitMonthBadge: {
    width: 44,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  visitChevron: {
    width: 10,
    height: 22,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
