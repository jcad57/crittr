import {
  ACTIVITY_ROW_ICON_BOX,
  ACTIVITY_ROW_ICON_IMG,
  ACTIVITY_ROW_ICONS,
} from "@/constants/activityRowIcons";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ActivityHistoryEntry } from "@/data/activityHistory";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  entry: ActivityHistoryEntry;
};

export default function ActivityHistoryRow({ entry }: Props) {
  const cfg = ACTIVITY_ROW_ICONS[entry.category];

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
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {entry.title}
          </Text>
          {entry.hasNotes ? (
            <MaterialCommunityIcons
              name="note-text-outline"
              size={14}
              color={Colors.gray400}
              style={styles.noteIcon}
              accessibilityLabel="Has notes"
            />
          ) : null}
        </View>
        <Text style={styles.detail} numberOfLines={2}>
          {entry.loggedByLine}
        </Text>
      </View>

      <View style={styles.right}>
        {entry.primaryStat ? (
          <Text style={styles.primaryStat}>{entry.primaryStat}</Text>
        ) : null}
        <Text style={styles.time}>{entry.timeLabel}</Text>
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
    width: ACTIVITY_ROW_ICON_BOX,
    height: ACTIVITY_ROW_ICON_BOX,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImg: {
    width: ACTIVITY_ROW_ICON_IMG,
    height: ACTIVITY_ROW_ICON_IMG,
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  noteIcon: {
    marginTop: 2,
    flexShrink: 0,
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
  time: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
});
