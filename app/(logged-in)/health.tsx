import HealthActionBanner from "@/components/ui/health/HealthActionBanner";
import HealthListCard from "@/components/ui/health/HealthListCard";
import HealthMedicationRow from "@/components/ui/health/HealthMedicationRow";
import HealthPetFilterChips from "@/components/ui/health/HealthPetFilterChips";
import HealthSectionHeader from "@/components/ui/health/HealthSectionHeader";
import HealthVaccinationRow from "@/components/ui/health/HealthVaccinationRow";
import HealthVisitRow from "@/components/ui/health/HealthVisitRow";
import RecordsNavCard, {
  type RecordsNavItem,
} from "@/components/ui/pet/RecordsNavCard";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  useHealthSnapshotQuery,
  useTodayActivitiesForPetIdsQuery,
} from "@/hooks/queries";
import { buildMedicationDosageProgress } from "@/lib/medicationDosageProgress";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { isMedicationDueToday } from "@/lib/healthTraffic";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
  const router = useRouter();
  const { data, isLoading, isError, error } = useHealthSnapshotQuery();

  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const pets = data?.pets ?? [];
  const medications = data?.medications ?? [];

  const petIds = useMemo(() => pets.map((p) => p.id), [pets]);
  const { data: todayActivitiesAllPets = [] } =
    useTodayActivitiesForPetIdsQuery(petIds);
  const vaccinations = data?.vaccinations ?? [];
  const vetVisits = data?.vetVisits ?? [];

  const filteredMeds = useMemo(
    () => filterByPet(medications, selectedPetId),
    [medications, selectedPetId],
  );
  const filteredVacs = useMemo(
    () => filterByPet(vaccinations, selectedPetId),
    [vaccinations, selectedPetId],
  );
  const filteredVisits = useMemo(
    () => filterByPet(vetVisits, selectedPetId),
    [vetVisits, selectedPetId],
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

  const showBanner =
    !bannerDismissed && dueTodayMeds.length > 0 && filteredMeds.length > 0;

  const bannerSubtitle = useMemo(() => {
    const m = dueTodayMeds[0];
    if (!m) return "";
    return `${m.pet.name}'s ${m.name} dose is due today`;
  }, [dueTodayMeds]);

  const defaultPetId = selectedPetId ?? pets[0]?.id;

  const updatedHint = useMemo(() => {
    const t = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return `All pets · Updated ${t}`;
  }, []);

  const recordsItems = useMemo((): RecordsNavItem[] => {
    if (!defaultPetId) return [];
    return [
      {
        id: "microchip",
        title: "Microchip details",
        subtitle: "Registry and ID",
        icon: "cellphone-nfc",
        iconBg: Colors.skyLight,
        iconColor: Colors.skyDark,
        onPress: () =>
          router.push(`/(logged-in)/pet/${defaultPetId}/microchip`),
      },
      {
        id: "vet-records",
        title: "Vet records",
        subtitle: "Past and upcoming visits",
        icon: "clipboard-text-outline",
        iconBg: Colors.orangeLight,
        iconColor: Colors.orange,
        onPress: () =>
          router.push(`/(logged-in)/pet/${defaultPetId}/vet-records`),
      },
    ];
  }, [defaultPetId, router]);

  const openAddVisit = () => {
    if (!defaultPetId) return;
    router.push(`/(logged-in)/add-vet-visit?petId=${defaultPetId}`);
  };

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
        style={[styles.screen, styles.noPetsScreen, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.pageTitle}>Health</Text>
            <Text style={styles.pageSubtitle}>Add a pet to track care</Text>
          </View>
          <Pressable
            style={styles.fab}
            onPress={() => router.push("/(logged-in)/add-pet")}
          >
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={Colors.white}
            />
          </Pressable>
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
          <Pressable
            style={styles.fab}
            onPress={() => router.push("/(logged-in)/add-pet")}
            accessibilityRole="button"
            accessibilityLabel="Add"
          >
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={Colors.white}
            />
          </Pressable>
        </View>

        {pets.length > 0 ? (
          <HealthPetFilterChips
            pets={pets}
            selectedPetId={selectedPetId}
            onSelect={setSelectedPetId}
          />
        ) : null}

        {showBanner ? (
          <HealthActionBanner
            title={
              dueTodayMeds.length === 1
                ? "1 action needed"
                : `${dueTodayMeds.length} actions needed`
            }
            subtitle={bannerSubtitle}
            onMarkDone={() => setBannerDismissed(true)}
          />
        ) : null}

        <HealthSectionHeader
          title="MEDICATIONS"
          onAddPress={
            defaultPetId
              ? () =>
                  router.push(`/(logged-in)/pet/${defaultPetId}/medications`)
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
                    router.push(
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
              No medications on file for this filter.
            </Text>
          </View>
        )}

        <HealthSectionHeader
          title="VACCINATIONS"
          onAddPress={
            defaultPetId
              ? () => router.push(`/(logged-in)/pet/${defaultPetId}`)
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
                onPress={() => router.push(`/(logged-in)/pet/${v.pet_id}`)}
              />
            ))}
          </HealthListCard>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No vaccination records on file for this filter.
            </Text>
          </View>
        )}

        <HealthSectionHeader
          title="UPCOMING VISITS"
          onAddPress={defaultPetId ? openAddVisit : undefined}
        />
        {filteredVisits.length > 0 ? (
          <HealthListCard>
            {filteredVisits.map((v, i) => (
              <HealthVisitRow
                key={v.id}
                item={v}
                isLast={i === filteredVisits.length - 1}
                onPress={() => router.push(`/(logged-in)/pet/${v.pet_id}`)}
              />
            ))}
          </HealthListCard>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No upcoming visits for this filter.
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.sectionLabel,
    marginTop: 4,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
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
