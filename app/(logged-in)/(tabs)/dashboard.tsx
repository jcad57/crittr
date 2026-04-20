import AdBanner from "@/components/ads/AdBanner";
import PostOnboardingPushPrompt from "@/components/push/PostOnboardingPushPrompt";
import ActivityFeed from "@/components/ui/dashboard/ActivityFeed";
import ActivityFeedSkeleton from "@/components/ui/dashboard/ActivityFeedSkeleton";
import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DailyProgressSkeleton from "@/components/ui/dashboard/DailyProgressSkeleton";
import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import DashboardLoading from "@/components/ui/dashboard/DashboardLoading";
import HealthSection from "@/components/ui/dashboard/HealthSection";
import HealthSectionSkeleton from "@/components/ui/dashboard/HealthSectionSkeleton";
import PetManagement from "@/components/ui/dashboard/PetManagement";
import PullToRefreshScrollView from "@/components/ui/PullToRefreshScrollView";
import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import { Colors } from "@/constants/colors";
import type {
  DailyProgressCategory,
  MedicationSummary,
  PetSummary,
} from "@/types/ui";
import {
  usePetDetailsQuery,
  usePetVetVisitsQuery,
  usePetsQuery,
  useTodayActivitiesQuery,
  useUnreadNotificationCountQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { isDailyProgressComplete } from "@/lib/dailyProgressComplete";
import { getMedicationBadgeDisplay } from "@/lib/medicationBadgeDisplay";
import {
  buildMedicationDosageProgress,
  sumMedicationDoseProgress,
} from "@/lib/medicationDosageProgress";
import { vaccinationNeedsAttention } from "@/lib/healthTraffic";
import {
  isUpcomingVetVisit,
  mapPetVetVisitToDashboard,
} from "@/lib/vetVisitDashboard";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { dailyProgressFoodTarget, isTreatFood } from "@/lib/petFood";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { usePetStore } from "@/stores/petStore";
import type { Href } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push } = useNavigationCooldown();
  const { runWithProOrUpgrade } = useProGateNavigation();

  const goToAddPet = useCallback(() => {
    runWithProOrUpgrade(() => {
      push("/(logged-in)/add-pet" as Href);
    });
  }, [runWithProOrUpgrade, push]);

  const {
    data: dbPets,
    isLoading: isPetsLoading,
    refetch: refetchPets,
  } = usePetsQuery();
  const { activePetId, setActivePet } = usePetStore();
  const { data: unreadCount = 0, refetch: refetchUnreadCount } =
    useUnreadNotificationCountQuery();

  useEffect(() => {
    if (dbPets?.length) usePetStore.getState().initActivePetFromList(dbPets);
  }, [dbPets]);

  const {
    data: activePetDetails,
    isPending: detailsPending,
    refetch: refetchPetDetails,
  } = usePetDetailsQuery(activePetId);
  const {
    data: todayActivities,
    isPending: todayActivitiesPending,
    refetch: refetchTodayActivities,
  } = useTodayActivitiesQuery(activePetId);
  const {
    data: vetVisitRows,
    isPending: vetVisitsPending,
    refetch: refetchVetVisits,
  } = usePetVetVisitsQuery(activePetId ?? undefined);

  const pets: PetSummary[] = useMemo(
    () =>
      (dbPets ?? [])
        .filter(isPetActiveForDashboard)
        .map((p) => ({
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
          .reduce((sum, f) => sum + dailyProgressFoodTarget(f), 0)
      : 0;
    const totalTreats = details
      ? details.foods
          .filter((f) => isTreatFood(f))
          .reduce((sum, f) => sum + dailyProgressFoodTarget(f), 0)
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

  const dailyProgressAllComplete = useMemo(
    () => isDailyProgressComplete(dailyProgress),
    [dailyProgress],
  );

  const attentionVaccinations = useMemo(() => {
    if (!activePetDetails?.vaccinations?.length) return [];
    return activePetDetails.vaccinations.filter(vaccinationNeedsAttention);
  }, [activePetDetails]);

  const dashboardVetVisits = useMemo(() => {
    if (!vetVisitRows?.length) return [];
    return vetVisitRows
      .filter((v) => isUpcomingVetVisit(v.visit_at))
      .sort(
        (a, b) =>
          new Date(a.visit_at).getTime() - new Date(b.visit_at).getTime(),
      )
      .map(mapPetVetVisitToDashboard);
  }, [vetVisitRows]);

  const resolvedPetIdForPerm = useMemo(() => {
    if (
      activePetId &&
      (dbPets ?? []).some(
        (p) => p.id === activePetId && isPetActiveForDashboard(p),
      )
    ) {
      return activePetId;
    }
    return (dbPets ?? []).find((p) => isPetActiveForDashboard(p))?.id ?? null;
  }, [activePetId, dbPets]);

  const canLogActivities = useCanPerformAction(
    resolvedPetIdForPerm,
    "can_log_activities",
  );
  const canManageVetVisits = useCanPerformAction(
    resolvedPetIdForPerm,
    "can_manage_vet_visits",
  );
  const canManageMedications = useCanPerformAction(
    resolvedPetIdForPerm,
    "can_manage_medications",
  );
  const medications: MedicationSummary[] = useMemo(() => {
    if (!activePetDetails || !activePetId) return [];
    const acts = todayActivities ?? [];
    return activePetDetails.medications.map((m) => {
      const prog = buildMedicationDosageProgress(m, acts, activePetId);
      const badge = getMedicationBadgeDisplay(m, prog);
      return {
        id: m.id,
        name: m.name,
        frequency: m.frequency ?? "Daily",
        condition: m.condition ?? "",
        dosageDesc: m.dosage ?? "",
        current: prog.current,
        total: prog.total,
        lastTaken: prog.lastTaken,
        badgeKind: badge.kind,
        badgeLabel: badge.label,
      };
    });
  }, [activePetDetails, activePetId, todayActivities]);

  const navigateToAddActivity = useCallback(() => {
    push("/(logged-in)/add-activity");
  }, [push]);

  const navigateToActivity = useCallback(() => {
    push("/(logged-in)/activity");
  }, [push]);

  const handleSwitchPet = useCallback(
    (id: string) => {
      setActivePet(id);
    },
    [setActivePet],
  );

  const openMedicationEditor = useCallback(
    (medicationId: string) => {
      if (!activePetId) return;
      push(
        `/(logged-in)/pet/${activePetId}/medications/${medicationId}` as Href,
      );
    },
    [push, activePetId],
  );

  const openAddMedication = useCallback(() => {
    if (!activePetId) return;
    push(`/(logged-in)/pet/${activePetId}/medications/new` as Href);
  }, [push, activePetId]);

  const openVetVisitEditor = useCallback(
    (visitId: string) => {
      if (!activePetId) return;
      push(
        `/(logged-in)/pet/${activePetId}/vet-visits/${visitId}` as Href,
      );
    },
    [push, activePetId],
  );

  const scheduleVetVisit = useCallback(() => {
    if (!activePetId) return;
    push(`/(logged-in)/add-vet-visit?petId=${activePetId}` as Href);
  }, [push, activePetId]);

  const handleDashboardRefresh = useCallback(async () => {
    const tasks: Promise<unknown>[] = [refetchPets(), refetchUnreadCount()];
    if (activePetId) {
      tasks.push(
        refetchPetDetails(),
        refetchTodayActivities(),
        refetchVetVisits(),
      );
    }
    await Promise.all(tasks);
  }, [
    activePetId,
    refetchPets,
    refetchUnreadCount,
    refetchPetDetails,
    refetchTodayActivities,
    refetchVetVisits,
  ]);

  const showDailyProgressSkeleton =
    Boolean(activePetId) && (detailsPending || todayActivitiesPending);
  const showActivitySkeleton =
    Boolean(activePetId) && todayActivitiesPending;
  const showHealthSkeleton =
    Boolean(activePetId) && (detailsPending || vetVisitsPending);

  if (isPetsLoading && !dbPets) {
    return <DashboardLoading />;
  }

  return (
    <View style={styles.root}>
      <PostOnboardingPushPrompt />
      <View style={styles.screen}>
        <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerInner}>
            <DashboardHeader
              pets={pets}
              activePetId={activePetId}
              onSwitchPet={handleSwitchPet}
              unreadNotificationCount={unreadCount}
              onNotificationsPress={() =>
                push("/(logged-in)/notifications" as Href)
              }
              onProfilePress={() => push("/(logged-in)/profile")}
            />
          </View>
        </View>

        <PullToRefreshScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: scrollInsetBottom },
          ]}
          showsVerticalScrollIndicator={false}
          onRefresh={handleDashboardRefresh}
        >
          <View style={styles.petDataBlock}>
            <AdBanner placement="dashboard_top" />
            <View style={styles.sectionBlock}>
              <SectionLabel style={styles.sectionLabelFlush}>
                Daily Progress
              </SectionLabel>
              <View
                style={[
                  styles.progressCard,
                  dailyProgressAllComplete && styles.progressCardComplete,
                ]}
              >
                {showDailyProgressSkeleton ? (
                  <DailyProgressSkeleton />
                ) : (
                  <DailyProgress
                    categories={dailyProgress}
                    allComplete={dailyProgressAllComplete}
                  />
                )}
              </View>
            </View>

            {showActivitySkeleton ? (
              <ActivityFeedSkeleton />
            ) : (
              <ActivityFeed
                activities={todayActivities ?? []}
                onLogActivityPress={navigateToAddActivity}
                onSeeAllPress={navigateToActivity}
                showLogActivity={canLogActivities === true}
              />
            )}

            {showHealthSkeleton ? (
              <HealthSectionSkeleton />
            ) : (
              <HealthSection
                medications={medications}
                vetVisits={dashboardVetVisits}
                onScheduleVisitPress={
                  canManageVetVisits === true ? scheduleVetVisit : undefined
                }
                onVetVisitPress={openVetVisitEditor}
                onMedicationPress={openMedicationEditor}
                onAddMedicationPress={
                  canManageMedications === true ? openAddMedication : undefined
                }
                attentionVaccinations={attentionVaccinations}
                onVaccinationAttentionPress={
                  activePetId
                    ? () =>
                        push(
                          `/(logged-in)/pet/${activePetId}/vaccinations` as Href,
                        )
                    : undefined
                }
              />
            )}
          </View>

          <PetManagement pets={pets} onAddPet={goToAddPet} />
        </PullToRefreshScrollView>
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
  progressCardComplete: {
    backgroundColor: Colors.successLight,
    borderColor: "rgba(22, 163, 74, 0.22)",
  },
  petDataBlock: {
    gap: 20,
  },
});
