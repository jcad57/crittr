import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { medicationTraffic } from "@/lib/healthTraffic";
import type { MedicationWithPet } from "@/services/health";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import HealthTrafficBadge from "./HealthTrafficBadge";

type Props = {
  item: MedicationWithPet;
  isLast?: boolean;
  onPress: () => void;
};

function formatSubline(m: MedicationWithPet): string {
  const parts = [m.frequency, m.dosage, m.condition].filter(
    (s) => s && String(s).trim(),
  );
  return [m.pet.name, ...parts].join(" · ");
}

export default function HealthMedicationRow({
  item,
  isLast,
  onPress,
}: Props) {
  const t = medicationTraffic(item);
  return (
    <Pressable
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={onPress}
    >
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="pill" size={20} color={Colors.orange} />
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
    backgroundColor: Colors.orangeLight,
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
