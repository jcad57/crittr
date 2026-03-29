import HealthTrafficBadge from "@/components/ui/health/HealthTrafficBadge";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { vaccinationTraffic } from "@/lib/healthTraffic";
import type { PetVaccination } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

function formatSubline(v: PetVaccination): string {
  const parts: string[] = [];
  if (v.frequency_label?.trim()) parts.push(v.frequency_label.trim());
  if (v.expires_on?.trim()) {
    const d = new Date(`${v.expires_on}T12:00:00`);
    parts.push(
      `Exp. ${d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`,
    );
  }
  return parts.length ? parts.join(" · ") : "—";
}

type Props = {
  vaccination: PetVaccination;
  isLast?: boolean;
  onPress?: () => void;
};

export default function VaccinationAttentionRow({
  vaccination,
  isLast,
  onPress,
}: Props) {
  const t = vaccinationTraffic(vaccination);
  const subline = formatSubline(vaccination);

  const main = (
    <>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="needle" size={20} color={Colors.orange} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {vaccination.name}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {subline}
        </Text>
      </View>
      <HealthTrafficBadge kind={t.kind} label={t.label} />
      {onPress ? (
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
