import { Colors } from "@/constants/colors";
import type { ActivityCategory, TextSegment } from "@/data/mockDashboard";
import { Image, ImageSource } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

// ─── Category config (mirrors DailyProgress mapping) ─────────────────────────

type CategoryConfig = {
  icon: ImageSource;
  iconBg: string;
  iconTint: string;
  label: string;
};

const CATEGORY_CONFIG: Record<ActivityCategory, CategoryConfig> = {
  exercise: {
    icon: require("@/assets/icons/walk-dog-icon.png"),
    iconBg: Colors.coralLight,
    iconTint: Colors.coral,
    label: "Exercise",
  },
  meals: {
    icon: require("@/assets/icons/food-icon.png"),
    iconBg: Colors.lavenderLight,
    iconTint: Colors.lavender,
    label: "Meal",
  },
  treats: {
    icon: require("@/assets/icons/dog-bone-icon.png"),
    iconBg: Colors.skyLight,
    iconTint: Colors.sky,
    label: "Treat",
  },
  meds: {
    icon: require("@/assets/icons/medicine-icon.png"),
    iconBg: Colors.goldLight,
    iconTint: Colors.gold,
    label: "Medication",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

type ActivityItemProps = {
  category: ActivityCategory;
  segments: TextSegment[];
  timeLabel: string;
  loggedBy: string;
};

const ICON_SIZE = 44;

export default function ActivityItem({
  category,
  segments,
  timeLabel,
  loggedBy,
}: ActivityItemProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <View style={styles.card}>
      {/* Category icon */}
      <View style={[styles.iconCircle]}>
        <Image
          source={config.icon}
          style={styles.icon}
          tintColor={Colors.black}
        />
      </View>

      {/* Text block */}
      <View style={styles.body}>
        <Text style={styles.description} numberOfLines={2}>
          {loggedBy}{" "}
          {segments.map((seg, i) => (
            <Text key={i} style={seg.bold ? styles.bold : undefined}>
              {seg.text}
            </Text>
          ))}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{config.label}</Text>
          <Text style={styles.metaDivider}>·</Text>
          <Text style={styles.metaText}>{timeLabel}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
    // Subtle drop shadow
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: {
    width: 24,
    height: 24,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  description: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  bold: {
    fontFamily: "InstrumentSans-Bold",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metaText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metaDivider: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.gray300,
  },
  loggedBy: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
