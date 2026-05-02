import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { VetVisitWithPet } from "@/services/health";
import { formatUserShortWeekdayMonthDayTime } from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  item: VetVisitWithPet;
  isLast?: boolean;
  onPress: () => void;
};

export default function HealthVisitRow({ item, isLast, onPress }: Props) {
  const { timeDisplay, dateDisplay } = useUserDateTimePrefs();
  const when =
    formatUserShortWeekdayMonthDayTime(
      new Date(item.visit_at),
      dateDisplay,
      timeDisplay,
    ) || "—";

  return (
    <Pressable
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
    >
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name="calendar-clock"
          size={20}
          color={Colors.lavenderDark}
        />
      </View>
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {item.pet.name} · {when}
        </Text>
        {item.location?.trim() ? (
          <Text style={styles.location} numberOfLines={2}>
            {item.location.trim()}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={Colors.gray400}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lavenderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
  },
  location: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
});
