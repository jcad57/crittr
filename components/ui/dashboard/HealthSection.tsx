import HealthListCard from "@/components/ui/health/HealthListCard";
import VaccinationAttentionRow from "@/components/ui/vaccination/VaccinationAttentionRow";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import type { MedicationSummary, VetVisitSummary } from "@/types/ui";
import type { PetVaccination } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MedicationCard from "./MedicationCard";
import SectionLabel from "./SectionLabel";
import UpcomingVisitFeatureCard from "./UpcomingVisitFeatureCard";

type HealthSectionProps = {
  medications: MedicationSummary[];
  vetVisits: VetVisitSummary[];
  onScheduleVisitPress?: () => void;
  onViewAllVisitsPress?: () => void;
  /** Tapping a scheduled visit opens edit (same pattern as medications). */
  onVetVisitPress?: (visitId: string) => void;
  /** When set, tapping a medication opens its edit screen. */
  onMedicationPress?: (medicationId: string) => void;
  /** When meds are empty, "+ Add a medication" calls this. */
  onAddMedicationPress?: () => void;
  /** Shown only when at least one shot is on file with expiry overdue or within 60 days. */
  attentionVaccinations?: PetVaccination[];
  onVaccinationAttentionPress?: () => void;
  /** Household litter goals (all cats); above vet visits. */
  maintenanceCard?: {
    title: string;
    subtitle: string;
    onPress: () => void;
  } | null;
  /** Active pet name included alongside the visit details. */
  vetVisitPetName?: string | null;
};

export default function HealthSection({
  medications,
  vetVisits,
  onScheduleVisitPress,
  onViewAllVisitsPress,
  onVetVisitPress,
  onMedicationPress,
  onAddMedicationPress,
  attentionVaccinations,
  onVaccinationAttentionPress,
  maintenanceCard,
  vetVisitPetName,
}: HealthSectionProps) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const hasMeds = medications.length > 0;
  const hasVisits = vetVisits.length > 0;
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
                onMedicationPress ? () => onMedicationPress(med.id) : undefined
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

      {maintenanceCard ? (
        <>
          <SectionLabel style={styles.visitsLabel}>
            {maintenanceCard.title}
          </SectionLabel>
          <TouchableOpacity
            style={styles.maintenanceCard}
            activeOpacity={0.85}
            onPress={maintenanceCard.onPress}
          >
            <Text style={styles.maintenanceTitle}>Litter box</Text>
            <Text style={styles.maintenanceSubtitle}>
              {maintenanceCard.subtitle}
            </Text>
            <Text style={styles.maintenanceCta}>Edit goals</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <View style={styles.visitsHeading}>
        <SectionLabel style={styles.visitsHeadingLabel}>
          Health & wellbeing
        </SectionLabel>
        {onViewAllVisitsPress ? (
          <TouchableOpacity
            style={styles.viewAll}
            activeOpacity={0.7}
            onPress={onViewAllVisitsPress}
            accessibilityRole="button"
            accessibilityLabel="View all health and vet visits"
          >
            <Text style={styles.viewAllText}>View all</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={Colors.peachDark}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {hasVisits ? (
        vetVisits.map((visit) => (
          <UpcomingVisitFeatureCard
            key={visit.id}
            visit={visit}
            petName={vetVisitPetName}
            onPress={
              onVetVisitPress ? () => onVetVisitPress(visit.id) : undefined
            }
          />
        ))
      ) : (
        <UpcomingVisitFeatureCard empty onPress={onScheduleVisitPress} />
      )}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  visitsLabel: {
    marginTop: 20,
  },
  visitsHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 10,
  },
  visitsHeadingLabel: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minHeight: 44,
  },
  viewAllText: {
    fontFamily: Font.uiBold,
    fontSize: 13,
    color: Colors.peachDark,
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
  maintenanceCard: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 20,
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 4,
    gap: 6,
  },
  maintenanceTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  maintenanceSubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  maintenanceCta: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.orange,
    marginTop: 4,
  },
}));
