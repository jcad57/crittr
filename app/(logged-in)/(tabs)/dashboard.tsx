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
import { Colors } from "@/theme/colors";
import type { DailyProgressCategory, MedicationSummary } from "@/types/ui";
import {
  usePetDetailsQuery,
  usePetVetVisitsQuery,
  usePetsQuery,
  useTodayActivitiesQuery,
  useUnreadNotificationCountQuery,
  useTodayActivitiesForPetIdsQuery,
  useActivitiesSinceForPetIdsQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import {
  AUTH_CONTENT_MAX_WIDTH,
  useResponsiveUi,
} from "@/hooks/useResponsiveUi";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { isDailyProgressComplete } from "@/utils/dailyProgressComplete";
import { buildDailyProgressRings } from "@/utils/dailyProgressRings";
import { getMedicationBadgeDisplay } from "@/utils/medicationBadgeDisplay";
import { buildMedicationDosageProgress } from "@/utils/medicationDosageProgress";
import { vaccinationNeedsAttention } from "@/utils/healthTraffic";
import {
  isUpcomingVetVisit,
  mapPetVetVisitToDashboard,
} from "@/utils/vetVisitDashboard";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import { householdActiveCatIds, userHasAnyActiveCat } from "@/utils/householdCats";
import { maintenancePeriodStart, formatHouseholdLitterGoalSubtitle } from "@/utils/litterMaintenancePeriod";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { useActivePet } from "@/hooks/useActivePet";
import type { Href } from "expo-router";
import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Horizontal padding on `styles.content` — used with `AUTH_CONTENT_MAX_WIDTH` for capped sections. */
const DASHBOARD_SCROLL_PADDING_H = 16;

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { windowWidth } = useResponsiveUi();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push } = useNavigationCooldown();
  const { runWithProOrUpgrade } = useProGateNavigation();
  const { timeDisplay, dateDisplay } = useUserDateTimePrefs();

  const {
    data: dbPets,
    isLoading: isPetsLoading,
    refetch: refetchPets,
  } = usePetsQuery();

  /**
   * First pet is always free (free-tier limit is one pet). Pro is only
   * required to add a *second* (or later) pet. This guards against the
   * "limbo zero-pet" state where a Pro user with stale entitlement gets
   * gated out of adding a replacement pet after a Pro -> Free transition
   * cleared their old one.
   */
  const livingOwnedPetCount = useMemo(() => {
    if (!dbPets) return 0;
    return dbPets.filter(
      (p) => p.role === "owner" && isPetActiveForDashboard(p),
    ).length;
  }, [dbPets]);

  const goToAddPet = useCallback(() => {
    if (livingOwnedPetCount === 0) {
      push("/(logged-in)/add-pet" as Href);
      return;
    }
    runWithProOrUpgrade(() => {
      push("/(logged-in)/add-pet" as Href);
    });
  }, [livingOwnedPetCount, runWithProOrUpgrade, push]);

  const { activePetId, pets, switchPet } = useActivePet();
  const { data: unreadCount = 0, refetch: refetchUnreadCount } =
    useUnreadNotificationCountQuery();

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

  const localYmd = useLocalCalendarYmd();
  const householdOwnerId = activePetDetails?.owner_id ?? null;
  const householdCatIds = useMemo(
    () => householdActiveCatIds(dbPets ?? [], householdOwnerId),
    [dbPets, householdOwnerId],
  );

  const litterPeriod =
    activePetDetails?.household_litter_cleaning_period ?? null;
  const isCatProgress = activePetDetails?.pet_type === "cat";

  const needsMaintWindow =
    isCatProgress &&
    !!litterPeriod &&
    litterPeriod !== "day";

  const maintenanceSinceIso = useMemo(() => {
    if (!needsMaintWindow || !litterPeriod) return null;
    return maintenancePeriodStart(litterPeriod).toISOString();
  }, [needsMaintWindow, litterPeriod, localYmd]);

  const {
    data: householdCatTodayActs = [],
    isPending: householdCatTodayPending,
    refetch: refetchHouseholdCatToday,
  } = useTodayActivitiesForPetIdsQuery(householdCatIds);

  const {
    data: householdMaintenanceWindowActs = [],
    isPending: householdMaintWindowPending,
    refetch: refetchHouseholdMaintWindow,
  } = useActivitiesSinceForPetIdsQuery(
    householdCatIds,
    maintenanceSinceIso,
    Boolean(
      householdCatIds.length > 0 &&
        needsMaintWindow &&
        maintenanceSinceIso,
    ),
  );

  const dailyProgress: DailyProgressCategory[] = useMemo(
    () =>
      buildDailyProgressRings({
        details: activePetDetails ?? null,
        activities: todayActivities ?? [],
        householdCatToday: householdCatTodayActs,
        householdMaintenanceWindow: householdMaintenanceWindowActs,
        activePetId,
      }),
    [
      activePetDetails,
      todayActivities,
      householdCatTodayActs,
      householdMaintenanceWindowActs,
      activePetId,
    ],
  );

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
      .map((v) =>
        mapPetVetVisitToDashboard(v, timeDisplay, dateDisplay),
      );
  }, [vetVisitRows, timeDisplay, dateDisplay]);

  const canLogActivities = useCanPerformAction(
    activePetId,
    "can_log_activities",
  );
  const canManageVetVisits = useCanPerformAction(
    activePetId,
    "can_manage_vet_visits",
  );
  const canManageMedications = useCanPerformAction(
    activePetId,
    "can_manage_medications",
  );
  const medications: MedicationSummary[] = useMemo(() => {
    if (!activePetDetails || !activePetId) return [];
    const acts = todayActivities ?? [];
    return activePetDetails.medications.map((m) => {
      const prog = buildMedicationDosageProgress(
        m,
        acts,
        activePetId,
        timeDisplay,
      );
      const badge = getMedicationBadgeDisplay(m, prog, dateDisplay);
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
  }, [activePetDetails, activePetId, todayActivities, timeDisplay, dateDisplay]);

  const navigateToAddActivity = useCallback(() => {
    push("/(logged-in)/add-activity");
  }, [push]);

  const navigateToActivity = useCallback(() => {
    if (!activePetId) return;
    push(`/(logged-in)/pet/${activePetId}/activity-log` as Href);
  }, [push, activePetId]);

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

  const maintenanceCard = useMemo(() => {
    if (!userHasAnyActiveCat(dbPets ?? [])) return null;
    if (!activePetDetails) return null;
    return {
      title: "Maintenance",
      subtitle: formatHouseholdLitterGoalSubtitle(
        activePetDetails.household_litter_cleaning_period ?? null,
        activePetDetails.household_litter_cleanings_per_period ?? null,
      ),
      onPress: () => push("/(logged-in)/litter-maintenance" as Href),
    };
  }, [dbPets, activePetDetails, push]);

  const handleDashboardRefresh = useCallback(async () => {
    const tasks: Promise<unknown>[] = [refetchPets(), refetchUnreadCount()];
    if (activePetId) {
      tasks.push(
        refetchPetDetails(),
        refetchTodayActivities(),
        refetchVetVisits(),
      );
    }
    if (householdCatIds.length > 0) {
      tasks.push(refetchHouseholdCatToday(), refetchHouseholdMaintWindow());
    }
    await Promise.all(tasks);
  }, [
    activePetId,
    householdCatIds,
    refetchPets,
    refetchUnreadCount,
    refetchPetDetails,
    refetchTodayActivities,
    refetchVetVisits,
    refetchHouseholdCatToday,
    refetchHouseholdMaintWindow,
  ]);

  const showDailyProgressSkeleton =
    Boolean(activePetId) &&
    (detailsPending ||
      todayActivitiesPending ||
      (needsMaintWindow && householdMaintWindowPending) ||
      (activePetDetails?.pet_type === "cat" &&
        householdCatIds.length > 0 &&
        householdCatTodayPending));
  const showActivitySkeleton =
    Boolean(activePetId) && todayActivitiesPending;
  const showHealthSkeleton =
    Boolean(activePetId) && (detailsPending || vetVisitsPending);

  /** Matches scroll `paddingHorizontal` so rings stay readable on phones while capping width on tablets. */
  const dailyProgressSectionWidthStyle = useMemo(() => {
    const gutter = DASHBOARD_SCROLL_PADDING_H * 2;
    return {
      width: "100%" as const,
      maxWidth: Math.min(AUTH_CONTENT_MAX_WIDTH, windowWidth - gutter),
      alignSelf: "center" as const,
    };
  }, [windowWidth]);

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
              onSwitchPet={switchPet}
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
            <View style={[styles.sectionBlock, dailyProgressSectionWidthStyle]}>
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
                    petType={activePetDetails?.pet_type ?? null}
                    allComplete={dailyProgressAllComplete}
                    animationKey={activePetId ?? ""}
                  />
                )}
              </View>
            </View>

            {showActivitySkeleton ? (
              <ActivityFeedSkeleton />
            ) : (
              <ActivityFeed
                activities={todayActivities ?? []}
                petType={activePetDetails?.pet_type ?? null}
                onLogActivityPress={navigateToAddActivity}
                onSeeAllPress={navigateToActivity}
                showLogActivity={canLogActivities === true}
                animationKey={activePetId ?? ""}
              />
            )}

            {showHealthSkeleton ? (
              <HealthSectionSkeleton />
            ) : (
              <HealthSection
                medications={medications}
                vetVisits={dashboardVetVisits}
                vetVisitPetName={activePetDetails?.name ?? null}
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
                maintenanceCard={maintenanceCard}
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
    paddingHorizontal: DASHBOARD_SCROLL_PADDING_H,
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
