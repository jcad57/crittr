import HealthActionBanner from "@/components/ui/health/HealthActionBanner";
import HealthListCard from "@/components/ui/health/HealthListCard";
import HealthMedicationRow from "@/components/ui/health/HealthMedicationRow";
import HealthSectionHeader from "@/components/ui/health/HealthSectionHeader";
import HealthVaccinationRow from "@/components/ui/health/HealthVaccinationRow";
import HealthVisitRow from "@/components/ui/health/HealthVisitRow";
import RecordsNavCard, {
  type RecordsNavItem,
} from "@/components/ui/pet/RecordsNavCard";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useLogMedicationMutation } from "@/hooks/mutations/useLogActivityMutation";
import {
  useHealthSnapshotQuery,
  useTodayActivitiesForPetIdsQuery,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { getErrorMessage } from "@/lib/errorMessage";
import { isMedicationDueToday } from "@/lib/healthTraffic";
import { buildMedicationDosageProgress } from "@/lib/medicationDosageProgress";
import { medicationActivityFormForQuickLog } from "@/lib/medicationQuickLogForm";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetStore } from "@/stores/petStore";
import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function filterByPet<T extends { pet_id: string }>(
  rows: T[],
  petId: string | null,
): T[] {
  if (!petId) return rows;
  return rows.filter((r) => r.pet_id === petId);
}

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push } = useNavigationCooldown();
  const activePetId = usePetStore((s) => s.activePetId);
  const initActivePetFromList = usePetStore((s) => s.initActivePetFromList);
  const { data, isLoading, isError, error } = useHealthSnapshotQuery();

  const pets = data?.pets ?? [];

  useEffect(() => {
    if (pets.length > 0) initActivePetFromList(pets);
  }, [pets, initActivePetFromList]);

  /** PetNavAvatar + lists use global active pet; fallback until store syncs. */
  const effectivePetId = activePetId ?? pets[0]?.id ?? null;

  const canManageMedications = useCanPerformAction(
    effectivePetId,
    "can_manage_medications",
  );
  const canManageVaccinations = useCanPerformAction(
    effectivePetId,
    "can_manage_vaccinations",
  );
  const canManageVetVisits = useCanPerformAction(
    effectivePetId,
    "can_manage_vet_visits",
  );
  const canLogActivities = useCanPerformAction(
    effectivePetId,
    "can_log_activities",
  );

  const logMedicationMut = useLogMedicationMutation();

  const medications = data?.medications ?? [];

  const petIds = useMemo(() => pets.map((p) => p.id), [pets]);
  const {
    data: todayActivitiesAllPets = [],
    isFetched: todayActivitiesFetched,
  } = useTodayActivitiesForPetIdsQuery(petIds);
  const vaccinations = data?.vaccinations ?? [];
  const vetVisits = data?.vetVisits ?? [];

  const filteredMeds = useMemo(
    () => filterByPet(medications, effectivePetId),
    [medications, effectivePetId],
  );
  const filteredVacs = useMemo(
    () => filterByPet(vaccinations, effectivePetId),
    [vaccinations, effectivePetId],
  );
  const filteredVisits = useMemo(
    () => filterByPet(vetVisits, effectivePetId),
    [vetVisits, effectivePetId],
  );

  const dueTodayMeds = useMemo(
    () =>
      filteredMeds.filter((m) => {
        if (!isMedicationDueToday(m)) return false;
        const prog = buildMedicationDosageProgress(
          m,
          todayActivitiesAllPets,
          m.pet_id,
        );
        if (prog.total > 0) return !prog.isComplete;
        return true;
      }),
    [filteredMeds, todayActivitiesAllPets],
  );

  /** Don’t show until today’s activity query has settled — while pending, `[]` looks like no doses logged and inflates “due today” falsely. */
  const todayActivitiesReady = petIds.length === 0 || todayActivitiesFetched;

  const showBanner =
    todayActivitiesReady &&
    dueTodayMeds.length > 0 &&
    filteredMeds.length > 0;

  const handleMarkBannerDone = useCallback(async () => {
    const med = dueTodayMeds[0];
    if (!med) return;
    if (canLogActivities === false) {
      Alert.alert(
        "Can't log activity",
        "You don't have permission to log activities for this pet.",
      );
      return;
    }
    if (canLogActivities === undefined) return;
    try {
      await logMedicationMut.mutateAsync({
        petId: med.pet_id,
        form: medicationActivityFormForQuickLog(med),
        loggedAtIso: new Date().toISOString(),
      });
    } catch (e) {
      Alert.alert(
        "Couldn't log dose",
        getErrorMessage(e) ?? "Try again.",
      );
    }
  }, [dueTodayMeds, canLogActivities, logMedicationMut]);

  const bannerSubtitle = useMemo(() => {
    const m = dueTodayMeds[0];
    if (!m) return "";
    return `${m.pet.name}'s ${m.name} dose is due today`;
  }, [dueTodayMeds]);

  const updatedHint = useMemo(() => {
    const t = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const name = pets.find((p) => p.id === effectivePetId)?.name?.trim();
    return name ? `${name} · Updated ${t}` : `Updated ${t}`;
  }, [pets, effectivePetId]);

  const recordsItems = useMemo((): RecordsNavItem[] => {
    if (!effectivePetId) return [];
    return [
      {
        id: "microchip",
        title: "Microchip details",
        subtitle: "Registry and ID",
        icon: "cellphone-nfc",
        iconBg: Colors.skyLight,
        iconColor: Colors.skyDark,
        onPress: () =>
          push(`/(logged-in)/pet/${effectivePetId}/microchip`),
      },
      {
        id: "medical-records",
        title: "Medical Records",
        subtitle: "Visit notes and your uploads",
        icon: "clipboard-text-outline",
        iconBg: Colors.orangeLight,
        iconColor: Colors.orange,
        onPress: () =>
          push(`/(logged-in)/pet/${effectivePetId}/medical-records`),
      },
    ];
  }, [effectivePetId, push]);

  const openAddVisit = () => {
    if (!effectivePetId) return;
    push(`/(logged-in)/add-vet-visit?petId=${effectivePetId}`);
  };

  const openManageVaccinations = useCallback(() => {
    if (!effectivePetId) return;
    push(`/(logged-in)/pet/${effectivePetId}/vaccinations`);
  }, [effectivePetId, push]);

  if (isLoading && !data) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <Text style={styles.errorText}>
          {error?.message ?? "Could not load health data. Try again."}
        </Text>
      </View>
    );
  }

  if (!isLoading && pets.length === 0) {
    return (
      <View
        style={[
          styles.screen,
          styles.noPetsScreen,
          { paddingTop: insets.top + 8 },
        ]}
      >
        <View style={styles.headerTitles}>
          <Text style={styles.pageTitle}>Health</Text>
          <Text style={styles.pageSubtitle}>Add a pet to track care</Text>
        </View>
        <View style={[styles.emptyCard, styles.noPetsEmpty]}>
          <Text style={styles.emptyText}>
            Add a pet to see medications, visits, and vaccinations in one place.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.pageTitle}>Health</Text>
            <Text style={styles.pageSubtitle}>{updatedHint}</Text>
          </View>
          <PetNavAvatar accessibilityLabelPrefix="Health view for" />
        </View>

        {showBanner ? (
          <HealthActionBanner
            title={
              dueTodayMeds.length === 1
                ? "1 action needed"
                : `${dueTodayMeds.length} actions needed`
            }
            subtitle={bannerSubtitle}
            onMarkDone={() => {
              void handleMarkBannerDone();
            }}
            loading={logMedicationMut.isPending}
            disabled={canLogActivities === false || canLogActivities === undefined}
          />
        ) : null}

        <HealthSectionHeader
          title="MEDICATIONS"
          onAddPress={
            effectivePetId && canManageMedications === true
              ? () =>
                  push(`/(logged-in)/pet/${effectivePetId}/medications`)
              : undefined
          }
        />
        {filteredMeds.length > 0 ? (
          <HealthListCard>
            {filteredMeds.map((m, i) => {
              const prog = buildMedicationDosageProgress(
                m,
                todayActivitiesAllPets,
                m.pet_id,
              );
              const dosageLabel =
                prog.total > 0 ? `${prog.current}/${prog.total}` : undefined;
              return (
                <HealthMedicationRow
                  key={m.id}
                  item={m}
                  isLast={i === filteredMeds.length - 1}
                  onPress={() =>
                    push(
                      `/(logged-in)/pet/${m.pet_id}/medications/${m.id}`,
                    )
                  }
                  dosageLabel={dosageLabel}
                  dosageComplete={dosageLabel ? prog.isComplete : undefined}
                />
              );
            })}
          </HealthListCard>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No medications on file for this pet.
            </Text>
          </View>
        )}

        <HealthSectionHeader
          title="VACCINATIONS"
          onAddPress={
            effectivePetId && canManageVaccinations === true
              ? openManageVaccinations
              : undefined
          }
        />
        {filteredVacs.length > 0 ? (
          <HealthListCard>
            {filteredVacs.map((v, i) => (
              <HealthVaccinationRow
                key={v.id}
                item={v}
                isLast={i === filteredVacs.length - 1}
                onPress={() =>
                  push(`/(logged-in)/pet/${v.pet_id}/vaccinations/${v.id}`)
                }
              />
            ))}
          </HealthListCard>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No vaccination records on file for this pet.
            </Text>
          </View>
        )}

        <HealthSectionHeader
          title="UPCOMING VISITS"
          onAddPress={
            effectivePetId && canManageVetVisits === true
              ? openAddVisit
              : undefined
          }
        />
        {filteredVisits.length > 0 ? (
          <HealthListCard>
            {filteredVisits.map((v, i) => (
              <HealthVisitRow
                key={v.id}
                item={v}
                isLast={i === filteredVisits.length - 1}
                onPress={() =>
                  push(`/(logged-in)/pet/${v.pet_id}/vet-visits/${v.id}`)
                }
              />
            ))}
          </HealthListCard>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No upcoming visits for this pet.
            </Text>
          </View>
        )}

        <HealthSectionHeader title="RECORDS" />
        <RecordsNavCard items={recordsItems} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.sectionLabel,
    marginTop: 4,
  },
  noPetsScreen: {
    paddingHorizontal: 20,
  },
  noPetsEmpty: {
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
});
