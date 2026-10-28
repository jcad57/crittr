import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import type { VetVisitSummary } from "@/types/ui";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type UpcomingVisitFeatureCardProps = {
  visit?: VetVisitSummary;
  petName?: string | null;
  onPress?: () => void;
  /** When true, encourages the user to schedule their next visit. */
  empty?: boolean;
};

export default function UpcomingVisitFeatureCard({
  visit,
  petName,
  onPress,
  empty,
}: UpcomingVisitFeatureCardProps) {
  if (empty || !visit) {
    const inner = (
      <View style={styles.emptyInner}>
        <MaterialCommunityIcons
          name="calendar-heart"
          size={28}
          color={Colors.peachDark}
        />
        <View style={styles.emptyTextBlock}>
          <Text style={styles.emptyTitle}>Schedule your next visit</Text>
          <Text style={styles.emptySubtitle}>
            Keep vaccinations and checkups on track
          </Text>
        </View>
        {onPress ? (
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={Colors.peachDark}
          />
        ) : null}
      </View>
    );
    if (onPress) {
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={onPress}
        >
          {inner}
        </TouchableOpacity>
      );
    }
    return <View style={styles.card}>{inner}</View>;
  }

  const details = [petName?.trim(), visit.subtitle, visit.time]
    .filter(Boolean)
    .join(" · ");
  const accessibilityLabel = [
    "Upcoming vet visit",
    petName?.trim(),
    visit.title,
    visit.date,
    visit.time,
    visit.subtitle,
  ]
    .filter(Boolean)
    .join(", ");
  const inner = (
    <View style={styles.row}>
      <View style={styles.dateTile}>
        <Text style={styles.day}>{visit.dayLabel}</Text>
        <Text style={styles.month}>{visit.badgeLabel?.toUpperCase()}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Upcoming vet visit</Text>
        <Text style={styles.title}>{visit.title}</Text>
        <Text style={styles.subtitle}>{details}</Text>
      </View>
      {onPress ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={Colors.textPrimary}
        />
      ) : null}
    </View>
  );

  return onPress ? (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {inner}
    </TouchableOpacity>
  ) : (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    backgroundColor: Colors.peach,
    paddingVertical: 17,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateTile: {
    minWidth: 54,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 17,
    backgroundColor: Colors.warmWhite,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  day: {
    fontFamily: Font.displayBold,
    fontSize: 29,
    lineHeight: 33,
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  month: {
    fontFamily: Font.uiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: Colors.textPrimary,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  eyebrow: {
    fontFamily: Font.uiBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: Colors.peachDark,
  },
  title: {
    fontFamily: Font.uiBold,
    fontSize: 17,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Font.uiMedium,
    fontSize: 13,
    color: "#7D6555",
    lineHeight: 18,
  },
  emptyInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  emptyTextBlock: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: Font.displayBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.peachDark,
    lineHeight: 18,
  },
});
