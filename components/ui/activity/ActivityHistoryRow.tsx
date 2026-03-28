import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ActivityCategory } from "@/data/mockDashboard";
import type { ActivityHistoryEntry } from "@/data/activityHistory";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

const ICONS: Record<
  ActivityCategory,
  { source: number; ring: string; track: string }
> = {
  exercise: {
    source: require("@/assets/icons/walk-dog-icon.png"),
    ring: Colors.progressExercise,
    track: Colors.progressExerciseTrack,
  },
  meals: {
    source: require("@/assets/icons/food-icon.png"),
    ring: Colors.progressMeals,
    track: Colors.progressMealsTrack,
  },
  treats: {
    source: require("@/assets/icons/dog-bone-icon.png"),
    ring: Colors.progressTreats,
    track: Colors.progressTreatsTrack,
  },
  meds: {
    source: require("@/assets/icons/medicine-icon.png"),
    ring: Colors.progressMeds,
    track: Colors.progressMedsTrack,
  },
};

type Props = {
  entry: ActivityHistoryEntry;
};

const ICON_BOX = 48;

export default function ActivityHistoryRow({ entry }: Props) {
  const cfg = ICONS[entry.category];

  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: cfg.track }]}>
        <Image
          source={cfg.source}
          style={styles.iconImg}
          tintColor={cfg.ring}
        />
      </View>

      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={2}>
          {entry.title}
        </Text>
        <Text style={styles.detail} numberOfLines={2}>
          {entry.detailLine}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.primaryStat}>{entry.primaryStat}</Text>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{entry.timeLabel}</Text>
          {entry.medDone ? (
            <View style={styles.donePill}>
              <Text style={styles.doneText}>Done</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImg: {
    width: 26,
    height: 26,
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  detail: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
  },
  right: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 4,
  },
  primaryStat: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  time: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
  donePill: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  doneText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 10,
    color: Colors.successDark,
  },
});
