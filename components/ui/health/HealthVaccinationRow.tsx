import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { vaccinationTraffic } from "@/lib/healthTraffic";
import type { VaccinationWithPet } from "@/services/health";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import HealthTrafficBadge from "./HealthTrafficBadge";

type Props = {
  item: VaccinationWithPet;
  isLast?: boolean;
  onPress: () => void;
};

function formatSubline(v: VaccinationWithPet): string {
  const exp = v.expires_on
    ? new Date(`${v.expires_on}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";
  const freq = v.frequency_label?.trim() || "—";
  return `${v.pet.name} · ${freq} · Exp. ${exp}`;
}

export default function HealthVaccinationRow({
  item,
  isLast,
  onPress,
}: Props) {
  const t = vaccinationTraffic(item);
  const iconName =
    t.kind === "due_today" || t.kind === "due_soon"
      ? "alert-circle-outline"
      : "check-circle-outline";
  const iconBg =
    t.kind === "current" ? Colors.mintLight : Colors.amberLight;
  const iconColor =
    t.kind === "current" ? Colors.successDark : Colors.amberDark;

  return (
    <Pressable
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {formatSubline(item)}
        </Text>
      </View>
      <HealthTrafficBadge kind={t.kind} label={t.label} />
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
});
