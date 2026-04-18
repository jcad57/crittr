import {
  ACTIVITY_ROW_ICONS,
} from "@/constants/activityRowIcons";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ActivityHistoryEntry } from "@/data/activityHistory";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

const ICON_BOX = 40;
const ICON_IMG = 22;

type Props = {
  entry: ActivityHistoryEntry;
};

/** Compact, read-only activity line for pet-scoped log screens (no card chrome). */
export default function PetActivityLogRow({ entry }: Props) {
  const cfg = ACTIVITY_ROW_ICONS[entry.category];

  return (
    <View style={styles.row}>
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
              size={13}
              color={Colors.gray400}
              style={styles.noteIcon}
              accessibilityLabel="Has notes"
            />
          ) : null}
        </View>
        {entry.loggedByLine ? (
          <Text style={styles.detail} numberOfLines={1}>
            Logged by {entry.loggedByLine}
          </Text>
        ) : null}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImg: {
    width: ICON_IMG,
    height: ICON_IMG,
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 3,
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
    fontSize: 12,
    color: Colors.gray500,
  },
  right: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 2,
  },
  primaryStat: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  time: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
});
