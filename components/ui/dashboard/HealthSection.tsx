import { Colors } from "@/constants/colors";
import type { Medication, VetVisit } from "@/data/mockDashboard";
import { StyleSheet, Text, View } from "react-native";
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
  return (
    <View style={styles.container}>
      <SectionHeader title="Health" onMorePress={onMorePress} />

      {/* Medications */}
      <Text style={styles.subHeading}>Medications</Text>
      {medications.map((med) => (
        <MedicationCard key={med.id} medication={med} />
      ))}

      {/* Vet Visits */}
      <Text style={[styles.subHeading, styles.vetHeading]}>
        Upcoming Vet Visits
      </Text>
      {vetVisits.map((visit) => (
        <VetVisitCard key={visit.id} visit={visit} />
      ))}
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
});
