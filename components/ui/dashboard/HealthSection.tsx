import { Colors } from "@/constants/colors";
import type { Medication, VetVisit } from "@/data/mockDashboard";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MedicationCard from "./MedicationCard";
import SectionHeader from "./SectionHeader";
import VetVisitCard from "./VetVisitCard";

type HealthSectionProps = {
  medications: Medication[];
  vetVisits: VetVisit[];
  onMorePress?: () => void;
};

export default function HealthSection({
  medications,
  vetVisits,
  onMorePress,
}: HealthSectionProps) {
  const hasMeds = medications.length > 0;
  const hasVisits = vetVisits.length > 0;

  return (
    <View style={styles.container}>
      <SectionHeader title="Health" onMorePress={onMorePress} />

      <Text style={styles.subHeading}>Medications</Text>
      {hasMeds ? (
        medications.map((med) => (
          <MedicationCard key={med.id} medication={med} />
        ))
      ) : (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>No medications added yet</Text>
        </View>
      )}

      <Text style={[styles.subHeading, styles.vetHeading]}>
        Upcoming Vet Visits
      </Text>
      {hasVisits ? (
        vetVisits.map((visit) => (
          <VetVisitCard key={visit.id} visit={visit} />
        ))
      ) : (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>No upcoming visits</Text>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
            <Text style={styles.addButtonText}>+ Add a Vet Visit</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  subHeading: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  vetHeading: {
    marginTop: 24,
  },
  emptyBlock: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 14,
    backgroundColor: Colors.gray50,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  addButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 14,
    color: Colors.orange,
  },
});
