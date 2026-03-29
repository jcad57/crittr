import HealthListCard from "@/components/ui/health/HealthListCard";
import VaccinationAttentionRow from "@/components/ui/vaccination/VaccinationAttentionRow";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Medication, VetVisit } from "@/data/mockDashboard";
import type { PetVaccination } from "@/types/database";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MedicationCard from "./MedicationCard";
import SectionLabel from "./SectionLabel";
import UpcomingVisitFeatureCard from "./UpcomingVisitFeatureCard";
import VetVisitCard from "./VetVisitCard";

type HealthSectionProps = {
  medications: Medication[];
  vetVisits: VetVisit[];
  onScheduleVisitPress?: () => void;
  /** When set, tapping a medication opens its edit screen. */
  onMedicationPress?: (medicationId: string) => void;
  /** When meds are empty, "+ Add a medication" calls this. */
  onAddMedicationPress?: () => void;
  /** Shown only when at least one shot is on file with expiry overdue or within 60 days. */
  attentionVaccinations?: PetVaccination[];
  onVaccinationAttentionPress?: () => void;
};

export default function HealthSection({
  medications,
  vetVisits,
  onScheduleVisitPress,
  onMedicationPress,
  onAddMedicationPress,
  attentionVaccinations,
  onVaccinationAttentionPress,
}: HealthSectionProps) {
  const hasMeds = medications.length > 0;
  const hasVisits = vetVisits.length > 0;
  const [primaryVisit, ...otherVisits] = vetVisits;
  const vacs = attentionVaccinations ?? [];
  const showVacAttention = vacs.length > 0;

  return (
    <View style={styles.container}>
      <SectionLabel>Current Medications</SectionLabel>

      {hasMeds ? (
        <HealthListCard>
          {medications.map((med, i) => (
            <MedicationCard
              key={med.id}
              medication={med}
              isLast={i === medications.length - 1}
              onPress={
                onMedicationPress
                  ? () => onMedicationPress(med.id)
                  : undefined
              }
            />
          ))}
        </HealthListCard>
      ) : (
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyText}>No medications added yet</Text>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.7}
            onPress={onAddMedicationPress}
            disabled={!onAddMedicationPress}
          >
            <Text style={styles.addButtonText}>+ Add a medication</Text>
          </TouchableOpacity>
        </View>
      )}

      {showVacAttention ? (
        <>
          <SectionLabel style={styles.vaccinationsLabel}>
            Vaccinations
          </SectionLabel>
          <HealthListCard>
            {vacs.map((v, i) => (
              <VaccinationAttentionRow
                key={v.id}
                vaccination={v}
                isLast={i === vacs.length - 1}
                onPress={onVaccinationAttentionPress}
              />
            ))}
          </HealthListCard>
        </>
      ) : null}

      <SectionLabel style={styles.visitsLabel}>
        Upcoming vet visits
      </SectionLabel>
      {hasVisits && primaryVisit ? (
        <>
          <UpcomingVisitFeatureCard visit={primaryVisit} />
          {otherVisits.map((visit) => (
            <VetVisitCard key={visit.id} visit={visit} />
          ))}
        </>
      ) : (
        <UpcomingVisitFeatureCard empty onPress={onScheduleVisitPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  visitsLabel: {
    marginTop: 20,
  },
  vaccinationsLabel: {
    marginTop: 20,
  },
  emptyBlock: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: Font.uiRegular,
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
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.orange,
  },
});
