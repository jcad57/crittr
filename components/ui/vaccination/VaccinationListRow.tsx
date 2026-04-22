import HealthTrafficBadge from "@/components/ui/health/HealthTrafficBadge";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { HealthTrafficKind } from "@/utils/healthTraffic";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type VaccinationListRowProps = {
  title: string;
  subline: string;
  badgeKind: HealthTrafficKind;
  badgeLabel: string;
  onPress?: () => void;
  onDeletePress?: () => void;
  isLast?: boolean;
  variant?: "grouped" | "standalone";
};

/**
 * Vaccination row — matches {@link MedicationListRow} layout (standalone + ✕).
 */
export default function VaccinationListRow({
  title,
  subline,
  badgeKind,
  badgeLabel,
  onPress,
  onDeletePress,
  isLast,
  variant = "grouped",
}: VaccinationListRowProps) {
  const showChevron = Boolean(onPress) && !onDeletePress;
  const isStandalone = variant === "standalone";

  const main = (
    <>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="needle" size={20} color={Colors.orange} />
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

  const groupedMain = onPress ? (
    <Pressable style={styles.rowMain} onPress={onPress}>
      {main}
    </Pressable>
  ) : (
    <View style={styles.rowMain}>{main}</View>
  );

  const standaloneMain = onPress ? (
    <Pressable
      style={styles.standalonePressable}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.standaloneCard}>
        <View style={styles.standaloneCardInner}>{main}</View>
      </View>
    </Pressable>
  ) : (
    <View style={styles.standalonePressable}>
      <View style={styles.standaloneCard}>
        <View style={styles.standaloneCardInner}>{main}</View>
      </View>
    </View>
  );

  return (
    <View
      style={[
        isStandalone ? styles.rowWrapStandalone : styles.rowWrap,
        !isStandalone && !isLast && styles.rowBorder,
      ]}
    >
      {isStandalone ? standaloneMain : groupedMain}
      {onDeletePress ? (
        <Pressable
          style={isStandalone ? styles.deleteHitStandalone : styles.deleteHit}
          onPress={onDeletePress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title}`}
        >
          <MaterialCommunityIcons name="close" size={26} color={Colors.error} />
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
  rowWrapStandalone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  standalonePressable: {
    flex: 1,
    minWidth: 0,
  },
  standaloneCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  standaloneCardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    minWidth: 0,
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
  deleteHitStandalone: {
    paddingHorizontal: 8,
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
