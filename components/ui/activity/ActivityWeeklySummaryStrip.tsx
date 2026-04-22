import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { WeeklyActivitySummary } from "@/data/activityHistory";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  summary: WeeklyActivitySummary;
};

const greenFooter = "#15803D";
const greyFooter = Colors.gray500;
const coralNudge = Colors.signOutCoral;
/** Worse than last week — fewer walks */
const negativeDelta = Colors.error;

export default function ActivityWeeklySummaryStrip({ summary }: Props) {
  const treatsOver = summary.treats > summary.weeklyTreatLimit;
  const treatFooter = treatsOver
    ? `${summary.treats - summary.weeklyTreatLimit} limit`
    : "On track";
  const treatFooterColor = treatsOver ? coralNudge : greenFooter;

  const walksDelta = summary.walksDeltaVsLastWeek;
  const walksUp = walksDelta > 0;
  const walksDown = walksDelta < 0;
  const walksDeltaColor = walksUp
    ? greenFooter
    : walksDown
      ? negativeDelta
      : greyFooter;
  const walksDeltaIcon = walksUp
    ? "arrow-up"
    : walksDown
      ? "arrow-down"
      : "minus";
  const walksDeltaLabel =
    walksDelta === 0
      ? "Same as last wk"
      : `${walksDelta > 0 ? "+" : ""}${walksDelta} vs last wk`;

  const mealsDelta = summary.mealsDeltaVsLastWeek;
  const mealsUp = mealsDelta > 0;
  const mealsDown = mealsDelta < 0;
  const mealsDeltaColor = mealsUp
    ? greenFooter
    : mealsDown
      ? negativeDelta
      : greyFooter;
  const mealsDeltaIcon = mealsUp
    ? "arrow-up"
    : mealsDown
      ? "arrow-down"
      : "minus";
  const mealsDeltaLabel =
    mealsDelta === 0
      ? "Same as last wk"
      : `${mealsDelta > 0 ? "+" : ""}${mealsDelta} vs last wk`;

  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.value}>{summary.walks}</Text>
        <Text style={styles.label}>Walks</Text>
        <View style={styles.footerRow}>
          <MaterialCommunityIcons
            name={walksDeltaIcon as "arrow-up" | "arrow-down" | "minus"}
            size={12}
            color={walksDeltaColor}
          />
          <Text style={[styles.footer, { color: walksDeltaColor }]}>
            {walksDeltaLabel}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.value}>{summary.meals}</Text>
        <Text style={styles.label}>Meals</Text>
        <View style={styles.footerRow}>
          <MaterialCommunityIcons
            name={mealsDeltaIcon as "arrow-up" | "arrow-down" | "minus"}
            size={12}
            color={mealsDeltaColor}
          />
          <Text style={[styles.footer, { color: mealsDeltaColor }]}>
            {mealsDeltaLabel}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={[styles.value, treatsOver && styles.valueCoral]}>
          {summary.treats}
        </Text>
        <Text style={styles.label}>Treats</Text>
        <View style={styles.footerRow}>
          {treatsOver ? (
            <MaterialCommunityIcons
              name="arrow-up"
              size={12}
              color={coralNudge}
            />
          ) : null}
          <Text style={[styles.footer, { color: treatFooterColor }]}>
            {treatFooter}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  value: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  valueCoral: {
    color: Colors.signOutCoral,
  },
  label: {
    fontFamily: Font.uiMedium,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 8,
  },
  footer: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
  },
});
