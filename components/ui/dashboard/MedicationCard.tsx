import { Colors } from "@/constants/colors";
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

  return (
    <TouchableOpacity
      style={[styles.card, isComplete && styles.cardComplete]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: medication.iconBg },
        ]}
      >
        <MaterialCommunityIcons
          name="pill"
          size={20}
          color={medication.iconColor}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>
          {medication.name}{" "}
          <Text style={styles.frequency}>({medication.frequency})</Text>
        </Text>
        <Text style={styles.details}>
          {medication.condition} · {medication.dosageDesc}
        </Text>
        {medication.lastTaken && (
          <Text style={styles.lastTaken}>
            (Last taken on {medication.lastTaken})
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

const ICON_SIZE = 38;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 10,
  },
  cardComplete: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successLight,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  frequency: {
    fontFamily: "InstrumentSans-Regular",
    color: Colors.textSecondary,
  },
  details: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  lastTaken: {
    fontFamily: "InstrumentSans-Regular",
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
    backgroundColor: Colors.gray100,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeComplete: {
    backgroundColor: Colors.success,
  },
  badgeText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  badgeTextComplete: {
    color: Colors.white,
  },
});
