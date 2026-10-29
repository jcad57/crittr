import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DailyProgressSkeleton from "@/components/ui/dashboard/DailyProgressSkeleton";
import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import type { DailyProgressCategory } from "@/types/ui";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, ReduceMotion, useReducedMotion } from "react-native-reanimated";

type DailyProgressCardProps = {
  categories: DailyProgressCategory[];
  petType?: string | null;
  allComplete: boolean;
  loading: boolean;
  animationKey?: string;
};

export default function DailyProgressCard({
  categories,
  petType,
  allComplete,
  loading,
  animationKey,
}: DailyProgressCardProps) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const [expanded, setExpanded] = useState(true);
  const reducedMotion = useReducedMotion();

  const toggle = () => {
    if (!reducedMotion) {
      LayoutAnimation.configureNext({
        duration: 220,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
    }
    setExpanded((value) => !value);
  };

  const progress = (compact: boolean) => loading ? (
    <DailyProgressSkeleton compact={compact} count={categories.length || 4} />
  ) : (
    <DailyProgress
      categories={categories}
      petType={petType}
      allComplete={allComplete}
      animationKey={animationKey}
      compact={compact}
    />
  );

  return (
    <View style={[styles.card, allComplete && styles.cardComplete]}>
      <Pressable
        style={styles.header}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? "Collapse daily progress" : "Expand daily progress"}
        accessibilityState={{ expanded }}
        accessibilityValue={!expanded && !loading ? {
          text: categories.map((category) => category.total > 0
            ? `${category.label}, ${category.current} of ${category.total}`
            : `${category.label}, not tracked`).join(". "),
        } : undefined}
      >
        <SectionLabel style={styles.title}>Daily progress</SectionLabel>
        {expanded ? <View style={styles.headerSpacer} /> : (
          <Animated.View
            style={styles.summary}
            entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {progress(true)}
          </Animated.View>
        )}
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={24}
          color={Colors.textPrimary}
          accessible={false}
        />
      </Pressable>
      {expanded && <View style={styles.body}>{progress(false)}</View>}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.peach,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  cardComplete: {
    backgroundColor: Colors.progressCompleteBackground,
    borderColor: Colors.progressCompleteBorder,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 32,
    gap: 8,
  },
  title: {
    marginBottom: 0,
    flexShrink: 1,
  },
  headerSpacer: {
    flex: 1,
  },
  summary: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    marginTop: 14,
  },
}));
