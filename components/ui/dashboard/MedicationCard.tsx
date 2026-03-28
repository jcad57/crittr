import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Medication } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type MedicationCardProps = {
  medication: Medication;
  onPress?: () => void;
};

export default function MedicationCard({
  medication,
  onPress,
}: MedicationCardProps) {
  const isComplete = medication.current >= medication.total;
  const subline = [
    medication.frequency,
    medication.condition,
    medication.dosageDesc,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <TouchableOpacity
      style={[styles.card, isComplete && styles.cardComplete]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[styles.iconSquare, { backgroundColor: medication.iconBg }]}
      >
        <MaterialCommunityIcons
          name="pill"
          size={22}
          color={medication.iconColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{medication.name}</Text>
        <Text style={styles.details} numberOfLines={2}>
          {subline}
        </Text>
        {medication.lastTaken && (
          <Text style={styles.lastTaken}>
            Last taken {medication.lastTaken}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <View style={[styles.badge, isComplete && styles.badgeComplete]}>
          <Text
            style={[styles.badgeText, isComplete && styles.badgeTextComplete]}
          >
            {medication.current}/{medication.total}
          </Text>
        </View>
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
  cardComplete: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successLight,
  },
  iconSquare: {
    width: ICON,
    height: ICON,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  details: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  lastTaken: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: Colors.gray400,
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badge: {
    backgroundColor: Colors.orangeLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeComplete: {
    backgroundColor: Colors.success,
  },
  badgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.orangeDark,
  },
  badgeTextComplete: {
    color: Colors.white,
  },
});
