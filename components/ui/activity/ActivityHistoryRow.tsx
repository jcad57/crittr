import {
  ACTIVITY_ROW_ICON_BOX,
  ACTIVITY_ROW_ICON_IMG,
  ACTIVITY_ROW_ICONS,
  resolveActivityRowIconSource,
} from "@/constants/activityRowIcons";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ActivityHistoryEntry } from "@/data/activityHistory";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  entry: ActivityHistoryEntry;
  petType?: string | null;
  /** When set, the row is tappable (e.g. open edit activity). */
  onPress?: () => void;
};

export default function ActivityHistoryRow({
  entry,
  petType = null,
  onPress,
}: Props) {
  const cfg = ACTIVITY_ROW_ICONS[entry.category];
  const iconSource = resolveActivityRowIconSource(entry.category, petType);
  const showChevron = !!onPress;

  const row = (
    <>
      <View style={[styles.iconBox, { backgroundColor: cfg.track }]}>
        <Image
          source={iconSource}
          style={styles.iconImg}
          tintColor={
            entry.category === "maintenance" ? undefined : cfg.ring
          }
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
        {entry.loggedByLine ? (
          <Text style={styles.detail} numberOfLines={2}>
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
        accessibilityLabel={`${entry.title}, edit activity`}
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
  chevron: {
    flexShrink: 0,
    marginLeft: -2,
  },
});
