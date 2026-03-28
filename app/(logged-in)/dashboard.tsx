import ActivityFeed from "@/components/ui/dashboard/ActivityFeed";
import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import DashboardLoading from "@/components/ui/dashboard/DashboardLoading";
import HealthSection from "@/components/ui/dashboard/HealthSection";
import PetManagement from "@/components/ui/dashboard/PetManagement";
import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import { Colors } from "@/constants/colors";
import type {
  DailyProgressCategory,
  Medication,
  Pet,
} from "@/data/mockDashboard";
import {
  usePetDetailsQuery,
  usePetsQuery,
  useTodayActivitiesQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import {
  buildMedicationDosageProgress,
  sumMedicationDoseProgress,
} from "@/lib/medicationDosageProgress";
import { feedingTimesPerDayTarget, isTreatFood } from "@/lib/petFood";
import { usePetStore } from "@/stores/petStore";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();

  const { data: dbPets, isLoading: isPetsLoading } = usePetsQuery();
  const { activePetId, setActivePet } = usePetStore();

  useEffect(() => {
    if (dbPets?.length) usePetStore.getState().initActivePetFromList(dbPets);
  }, [dbPets]);

  const { data: activePetDetails, isLoading: isDetailsLoading } =
    usePetDetailsQuery(activePetId);
  const { data: todayActivities } = useTodayActivitiesQuery(activePetId);

  const pets: Pet[] = useMemo(
    () =>
      (dbPets ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        breed: p.breed ?? "",
        imageUrl: p.avatar_url,
      })),
    [dbPets],
  );

  const dailyProgress: DailyProgressCategory[] = useMemo(() => {
    const details = activePetDetails ?? null;
    const acts = todayActivities ?? [];

    const totalMeals = details
      ? details.foods
          .filter((f) => !isTreatFood(f))
          .reduce((sum, f) => sum + feedingTimesPerDayTarget(f), 0)
      : 0;
    const totalTreats = details
      ? details.foods
          .filter((f) => isTreatFood(f))
          .reduce((sum, f) => sum + feedingTimesPerDayTarget(f), 0)
      : 0;
    const totalExercise =
      details?.exercises_per_day ?? details?.exercise?.walks_per_day ?? 0;
    const medPetId = activePetDetails?.id ?? activePetId ?? "";
    const medProgress =
      details && medPetId
        ? sumMedicationDoseProgress(details.medications, acts, medPetId)
        : { fulfilled: 0, expected: 0 };
    const currentMeds = medProgress.fulfilled;
    const totalMedsRing = medProgress.expected;
    const hasMeds = (details?.medications.length ?? 0) > 0;

    const currentExercise = acts.filter(
      (a) => a.activity_type === "exercise",
    ).length;
    const currentMeals = acts.filter(
      (a) => a.activity_type === "food" && !a.is_treat,
    ).length;
    const currentTreats = acts.filter(
      (a) => a.activity_type === "food" && a.is_treat,
    ).length;

    return [
      {
        id: "exercise",
        label: "Exercise",
        icon: "run",
        current: currentExercise,
        total: totalExercise,
        ringColor: Colors.progressExercise,
        trackColor: Colors.progressExerciseTrack,
      },
      {
        id: "meals",
        label: "Meals",
        icon: "food-drumstick",
        current: currentMeals,
        total: totalMeals,
        ringColor: Colors.progressMeals,
        trackColor: Colors.progressMealsTrack,
      },
      {
        id: "treats",
        label: "Treats",
        icon: "bone",
        current: currentTreats,
        total: totalTreats,
        ringColor: Colors.progressTreats,
        trackColor: Colors.progressTreatsTrack,
      },
      {
        id: "meds",
        label: "Meds",
        icon: "pill",
        current: currentMeds,
        total: hasMeds ? totalMedsRing : 0,
        ringColor: Colors.progressMeds,
        trackColor: Colors.progressMedsTrack,
      },
    ];
  }, [activePetDetails, todayActivities, activePetId]);

  const medications: Medication[] = useMemo(() => {
    if (!activePetDetails || !activePetId) return [];
    const acts = todayActivities ?? [];
    return activePetDetails.medications.map((m) => {
      const prog = buildMedicationDosageProgress(m, acts, activePetId);
      return {
        id: m.id,
        name: m.name,
        frequency: m.frequency ?? "Daily",
        condition: m.condition ?? "",
        dosageDesc: m.dosage ?? "",
        current: prog.current,
        total: prog.total,
        lastTaken: prog.lastTaken,
        iconBg: Colors.amberLight,
        iconColor: Colors.amberDark,
      };
    });
  }, [activePetDetails, activePetId, todayActivities]);

  const navigateToAddActivity = useCallback(() => {
    router.push("/(logged-in)/add-activity");
  }, [router]);

  const navigateToActivity = useCallback(() => {
    router.push("/(logged-in)/activity");
  }, [router]);

  const handleSwitchPet = useCallback(
    (id: string) => {
      setActivePet(id);
    },
    [setActivePet],
  );

  const showDetailsLoader = isDetailsLoading && !activePetDetails;

  if (isPetsLoading && !dbPets) {
    return <DashboardLoading />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <View style={styles.headerInner}>
            <DashboardHeader
              pets={pets}
              activePetId={activePetId}
              onSwitchPet={handleSwitchPet}
              onNotificationsPress={() => {}}
              onProfilePress={() => router.push("/(logged-in)/profile")}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: scrollInsetBottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.petDataBlock}>
            {showDetailsLoader ? (
              <View style={styles.sectionBlock}>
                <SectionLabel style={styles.sectionLabelFlush}>
                  Daily Progress
                </SectionLabel>
                <View style={styles.progressCard}>
                  <View style={styles.petDetailsLoading}>
                    <ActivityIndicator size="large" color={Colors.orange} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.sectionBlock}>
                  <SectionLabel style={styles.sectionLabelFlush}>
                    Daily Progress
                  </SectionLabel>
                  <View style={styles.progressCard}>
                    <DailyProgress categories={dailyProgress} />
                  </View>
                </View>

                <ActivityFeed
                  activities={todayActivities ?? []}
                  onLogActivityPress={navigateToAddActivity}
                  onSeeAllPress={navigateToActivity}
                />

                <HealthSection
                  medications={medications}
                  vetVisits={[]}
                  onScheduleVisitPress={() => {}}
                />
              </>
            )}
          </View>

          <PetManagement
            pets={pets}
            onAddPet={() => router.push("/(logged-in)/add-pet")}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  headerBar: {
    backgroundColor: Colors.cream,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.creamDark,
  },
  headerInner: {
    paddingHorizontal: 20,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 20,
  },
  /** Label + card for daily progress only */
  sectionBlock: {
    gap: 10,
  },
  sectionLabelFlush: {
    marginBottom: 0,
  },
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  petDataBlock: {
    gap: 20,
  },
  petDetailsLoading: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
});
