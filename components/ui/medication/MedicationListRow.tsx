import HealthTrafficBadge from "@/components/ui/health/HealthTrafficBadge";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { HealthTrafficKind } from "@/lib/healthTraffic";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type MedicationListRowProps = {
  title: string;
  subline: string;
  badgeKind: HealthTrafficKind;
  badgeLabel: string;
  onPress?: () => void;
  /** When set, shows a red ✕ beside the row (e.g. manager screen). */
  onDeletePress?: () => void;
  isLast?: boolean;
};

/**
 * Shared medication row — matches Health tab medications (icon, typography, traffic badge).
 */
export default function MedicationListRow({
  title,
  subline,
  badgeKind,
  badgeLabel,
  onPress,
  onDeletePress,
  isLast,
}: MedicationListRowProps) {
  const showChevron = Boolean(onPress) && !onDeletePress;

  const main = (
    <>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="pill" size={20} color={Colors.orange} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {subline}
        </Text>
      </View>
      <HealthTrafficBadge kind={badgeKind} label={badgeLabel} />
      {showChevron ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={Colors.gray400}
        />
      ) : null}
    </>
  );

  return (
    <View style={[styles.rowWrap, !isLast && styles.rowBorder]}>
      {onPress ? (
        <Pressable style={styles.rowMain} onPress={onPress}>
          {main}
        </Pressable>
      ) : (
        <View style={styles.rowMain}>{main}</View>
      )}
      {onDeletePress ? (
        <Pressable
          style={styles.deleteHit}
          onPress={onDeletePress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title}`}
        >
          <MaterialCommunityIcons name="close" size={24} color={Colors.error} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 4,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 12,
    gap: 10,
    minWidth: 0,
  },
  deleteHit: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTitle: {
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
});
