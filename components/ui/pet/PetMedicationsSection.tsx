import { Colors } from "@/constants/colors";
import type { Medication } from "@/data/mockDashboard";
import MedicationCard from "@/components/ui/dashboard/MedicationCard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type PetMedicationsSectionProps = {
  medications: Medication[];
  onAddMedication?: () => void;
};

export default function PetMedicationsSection({
  medications,
  onAddMedication,
}: PetMedicationsSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="pill" size={18} color={Colors.gold} />
          </View>
          <Text style={styles.title}>Medications</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddMedication}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="plus" size={16} color={Colors.white} />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      {medications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No medications recorded</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {medications.map((med) => (
            <MedicationCard key={med.id} medication={med} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.white,
  },
  list: {
    gap: 0,
  },
  empty: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
