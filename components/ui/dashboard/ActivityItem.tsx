import {
  ACTIVITY_ROW_ICON_BOX,
  ACTIVITY_ROW_ICON_IMG,
  ACTIVITY_ROW_ICONS,
} from "@/constants/activityRowIcons";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { displayCategory, pottyBreakSummary } from "@/data/activityHistory";
import { formatMedicationDosageDisplay } from "@/utils/medicationDosageDisplay";
import type { PetActivity } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildRightValue(a: PetActivity): string {
  switch (a.activity_type) {
    case "exercise": {
      const h = a.duration_hours ?? 0;
      const m = a.duration_minutes ?? 0;
      if (h > 0 && m > 0) return `${h}h ${m} min`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m} min`;
      return "";
    }
    case "food":
      return a.food_amount && a.food_unit
        ? `${a.food_amount} ${a.food_unit.toLowerCase()}`
        : "";
    case "medication":
      return formatMedicationDosageDisplay(a.med_amount, a.med_unit);
    case "vet_visit":
      return "";
    case "training": {
      const h = a.duration_hours ?? 0;
      const m = a.duration_minutes ?? 0;
      if (h > 0 && m > 0) return `${h}h ${m} min`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m} min`;
      return "";
    }
    case "potty":
      return pottyBreakSummary(a);
    default:
      return "";
  }
}

type Props = {
  activity: PetActivity;
  /** Resolved display name / "You" / "Unknown"; shown under the title. */
  loggerName: string;
  onPress?: () => void;
};

export default function ActivityItem({ activity, loggerName, onPress }: Props) {
  const iconCfg = ACTIVITY_ROW_ICONS[displayCategory(activity)];
  const rightVal = buildRightValue(activity);
  const time = formatTime(activity.logged_at);
  const hasNotes = !!activity.notes?.trim();
  const showChevron = !!onPress;

  const row = (
    <>
      <View style={[styles.iconBox, { backgroundColor: iconCfg.track }]}>
        <Image
          source={iconCfg.source}
          style={styles.iconImg}
          tintColor={iconCfg.ring}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.label} numberOfLines={1}>
            {activity.label}
          </Text>
          {hasNotes && (
            <MaterialCommunityIcons
              name="note-text-outline"
              size={14}
              color={Colors.gray400}
              style={styles.noteIcon}
            />
          )}
        </View>
        {loggerName ? (
          <Text style={styles.subline} numberOfLines={1}>
            Logged by {loggerName.split(" ")[0]}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {rightVal ? <Text style={styles.rightValue}>{rightVal}</Text> : null}
        <Text style={styles.timeLabel}>{time}</Text>
      </View>

      {showChevron ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={Colors.gray400}
          style={styles.chevron}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${activity.label}, edit activity`}
        android_ripple={{ color: "rgba(0,0,0,0.08)" }}
      >
        {row}
      </Pressable>
    );
  }

  return <View style={styles.card}>{row}</View>;
}

const styles = StyleSheet.create({
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
  cardPressed: {
    backgroundColor: Colors.gray50,
    borderColor: Colors.gray200,
  },
  iconBox: {
    width: ACTIVITY_ROW_ICON_BOX,
    height: ACTIVITY_ROW_ICON_BOX,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconImg: {
    width: ACTIVITY_ROW_ICON_IMG,
    height: ACTIVITY_ROW_ICON_IMG,
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  noteIcon: {
    marginTop: 1,
  },
  subline: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  right: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 2,
  },
  rightValue: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  timeLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chevron: {
    flexShrink: 0,
    marginLeft: -2,
  },
});
