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

type UpcomingVisitFeatureCardProps = {
  visit?: VetVisitSummary;
  onPress?: () => void;
  /** When true, renders a dark placeholder encouraging the user to schedule. */
  empty?: boolean;
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

export default function UpcomingVisitFeatureCard({
  visit,
  onPress,
  empty,
}: UpcomingVisitFeatureCardProps) {
  const { dateDisplay } = useUserDateTimePrefs();

  if (empty || !visit) {
    const inner = (
      <View style={styles.emptyInner}>
        <MaterialCommunityIcons
          name="calendar-heart"
          size={28}
          color={Colors.orangeLight}
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
            color={Colors.gray400}
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

  const badge = badgeFromVisit(visit, dateDisplay);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={styles.iconTile}>
          <MaterialCommunityIcons
            name="stethoscope"
            size={22}
            color={Colors.orangeLight}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{visit.title}</Text>
          {(visit.subtitle || visit.time) && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {visit.subtitle
                ? `${visit.subtitle} · ${visit.date}`
                : `${visit.date} · ${visit.time}`}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: Colors.featureDark,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.featureDarkElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: Font.uiBold,
    fontSize: 17,
    color: Colors.white,
  },
  subtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray400,
    lineHeight: 18,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.white,
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
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.white,
  },
  emptySubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray400,
    lineHeight: 18,
  },
});
