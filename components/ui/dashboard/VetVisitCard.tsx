import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { VetVisitSummary } from "@/types/ui";
import {
  dateLocaleFor,
  type UserDateDisplay,
} from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type VetVisitCardProps = {
  visit: VetVisitSummary;
  onPress?: () => void;
  onAddToCalendar?: () => void;
};

function badgeFromVisit(
  visit: VetVisitSummary,
  dateDisplay: UserDateDisplay,
): string {
  if (visit.badgeLabel) return visit.badgeLabel;
  const t = Date.parse(visit.date);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString(dateLocaleFor(dateDisplay), {
    month: "short",
  });
}

export default function VetVisitCard({
  visit,
  onPress,
  onAddToCalendar,
}: VetVisitCardProps) {
  const { dateDisplay } = useUserDateTimePrefs();
  const badge = badgeFromVisit(visit, dateDisplay);
  const sub =
    visit.subtitle ?? `${visit.date} · ${visit.time}`;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.iconSquare}>
        <MaterialCommunityIcons
          name="stethoscope"
          size={20}
          color={visit.accentColor}
        />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{visit.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {sub}
        </Text>
      </View>
      <View style={styles.right}>
        {badge ? (
          <View
            style={[styles.badge, { backgroundColor: Colors.orangeLight }]}
          >
            <Text style={[styles.badgeText, { color: Colors.orangeDark }]}>
              {badge}
            </Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.calendarButton}
          onPress={onAddToCalendar}
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="calendar-plus"
            size={20}
            color={Colors.gray500}
          />
        </TouchableOpacity>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={Colors.gray400}
        />
      </View>
    </TouchableOpacity>
  );
}

const ICON = 44;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 10,
  },
  iconSquare: {
    width: ICON,
    height: ICON,
    borderRadius: 14,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 0,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
  },
  calendarButton: {
    padding: 6,
  },
});
