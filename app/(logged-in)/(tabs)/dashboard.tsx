import ActivityTypePickerSheet from "@/components/activity/ActivityTypePickerSheet";
import AdBanner from "@/components/ads/AdBanner";
import { ProSoftPaywallSheet } from "@/components/pro/ProSoftPaywallSheet";
import PostOnboardingPushPrompt from "@/components/push/PostOnboardingPushPrompt";
import PullToRefreshScrollView from "@/components/ui/PullToRefreshScrollView";
import ActivityFeed from "@/components/ui/dashboard/ActivityFeed";
import ActivityFeedSkeleton from "@/components/ui/dashboard/ActivityFeedSkeleton";
import DailyProgress from "@/components/ui/dashboard/DailyProgress";
import DailyProgressSkeleton from "@/components/ui/dashboard/DailyProgressSkeleton";
import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import DashboardLoading from "@/components/ui/dashboard/DashboardLoading";
import HealthSection from "@/components/ui/dashboard/HealthSection";
import HealthSectionSkeleton from "@/components/ui/dashboard/HealthSectionSkeleton";
import PetManagement from "@/components/ui/dashboard/PetManagement";
import SectionLabel from "@/components/ui/dashboard/SectionLabel";
import type { ProSoftPaywallKind } from "@/constants/proCopy";
import {
  useActivitiesSinceForPetIdsQuery,
  usePetDetailsQuery,
  usePetVetVisitsQuery,
  usePetsQuery,
  useTodayActivitiesForPetIdsQuery,
  useTodayActivitiesQuery,
  useUnreadNotificationCountQuery,
} from "@/hooks/queries";
import { useActivePet } from "@/hooks/useActivePet";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import {
  AUTH_CONTENT_MAX_WIDTH,
  useResponsiveUi,
} from "@/hooks/useResponsiveUi";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/theme/colors";
import type { ActivityType, PetType } from "@/types/database";
import type { DailyProgressCategory, MedicationSummary } from "@/types/ui";
import { useScheduleDayQuery } from "@/hooks/queries/useScheduleQuery";
import { isScheduleDayComplete } from "@/utils/scheduleDayComplete";
import { isDailyProgressComplete } from "@/utils/dailyProgressComplete";
import { buildDailyProgressRings } from "@/utils/dailyProgressRings";
import { vaccinationNeedsAttention } from "@/utils/healthTraffic";
import {
  householdActiveCatIds,
  userHasAnyActiveCat,
} from "@/utils/householdCats";
import {
  formatHouseholdLitterGoalSubtitle,
  maintenancePeriodStart,
} from "@/utils/litterMaintenancePeriod";
import { getMedicationBadgeDisplay } from "@/utils/medicationBadgeDisplay";
import { buildMedicationDosageProgress } from "@/utils/medicationDosageProgress";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import {
  isUpcomingVetVisit,
  mapPetVetVisitToDashboard,
} from "@/utils/vetVisitDashboard";
import type { Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Horizontal padding on `styles.content` — used with `AUTH_CONTENT_MAX_WIDTH` for capped sections. */
const DASHBOARD_SCROLL_PADDING_H = 16;

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { windowWidth } = useResponsiveUi();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push } = useNavigationCooldown();
  const { runWithProOrUpgrade, isPro } = useProGateNavigation();
  const [softPaywall, setSoftPaywall] = useState<ProSoftPaywallKind | null>(
    null,
  );
  const { timeDisplay, dateDisplay } = useUserDateTimePrefs();

  const {
    data: dbPets,
    isLoading: isPetsLoading,
    isError: petsFailed,
    error: petsError,
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
    void runWithProOrUpgrade(
      () => {
        push("/(logged-in)/add-pet" as Href);
      },
      () => setSoftPaywall("pets"),
    );
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
  const { data: todaySchedule, refetch: refetchTodaySchedule } = useScheduleDayQuery(activePetId, localYmd);
  const allScheduledTasksComplete = isScheduleDayComplete(todaySchedule, activePetId, localYmd);
  const householdOwnerId = activePetDetails?.owner_id ?? null;
  const householdCatIds = useMemo(
    () => householdActiveCatIds(dbPets ?? [], householdOwnerId),
    [dbPets, householdOwnerId],
  );

  const litterPeriod =
    activePetDetails?.household_litter_cleaning_period ?? null;
  const isCatProgress = activePetDetails?.pet_type === "cat";

  const needsMaintWindow =
    isCatProgress && !!litterPeriod && litterPeriod !== "day";

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
      householdCatIds.length > 0 && needsMaintWindow && maintenanceSinceIso,
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
      .map((v) => mapPetVetVisitToDashboard(v, timeDisplay, dateDisplay));
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
  }, [
    activePetDetails,
    activePetId,
    todayActivities,
    timeDisplay,
    dateDisplay,
  ]);

  const [activityPickerVisible, setActivityPickerVisible] = useState(false);
  const [pickerPet, setPickerPet] = useState<{ id: string; type: PetType | null } | null>(null);
  const navigateToAddActivity = useCallback(() => {
    if (!activePetId || canLogActivities !== true) return;
    const pet = dbPets?.find(row => row.id === activePetId);
    setPickerPet({ id: activePetId, type: pet?.pet_type ?? null });
    setActivityPickerVisible(true);
  }, [activePetId, canLogActivities, dbPets]);
  const openSelectedActivity = useCallback((type: ActivityType) => {
    if (!pickerPet) return;
    push({ pathname: "/(logged-in)/add-activity", params: { type, petId: pickerPet.id } });
  }, [pickerPet, push]);

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
    const count = activePetDetails?.medications?.length ?? 0;
    if (!isPro && count >= 1) {
      push(`/(logged-in)/pet/${activePetId}/medications` as Href);
      return;
    }
    push(`/(logged-in)/pet/${activePetId}/medications/new` as Href);
  }, [push, activePetId, isPro, activePetDetails?.medications?.length]);

  const openVetVisitEditor = useCallback(
    (visitId: string) => {
      if (!activePetId) return;
      push(`/(logged-in)/pet/${activePetId}/vet-visits/${visitId}` as Href);
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
        refetchTodaySchedule(),
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
    refetchTodaySchedule,
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
  const showActivitySkeleton = Boolean(activePetId) && todayActivitiesPending;
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

  if (petsFailed && !dbPets) return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      <Text>Could not load your pets. {petsError?.message}</Text>
      <Pressable onPress={() => { void refetchPets(); }}><Text>Try again</Text></Pressable>
    </View>
  );
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
              <View
                style={[
                  styles.progressCard,
                  allScheduledTasksComplete && styles.progressCardComplete,
                ]}
              >
                <SectionLabel style={styles.sectionLabelFlush}>
                  Daily progress
                </SectionLabel>
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
                onViewAllVisitsPress={() =>
                  push("/(logged-in)/(tabs)/health" as Href)
                }
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
      <ActivityTypePickerSheet
        visible={activityPickerVisible}
        petType={pickerPet?.type ?? null}
        onClose={() => setActivityPickerVisible(false)}
        onSelect={openSelectedActivity}
      />
      <ProSoftPaywallSheet
        visible={softPaywall != null}
        kind={softPaywall}
        petName={activePetDetails?.name}
        onClose={() => setSoftPaywall(null)}
      />
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
    borderBottomWidth: 0,
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
    backgroundColor: Colors.peach,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 14,
  },
  progressCardComplete: {
    backgroundColor: Colors.successLight,
    borderColor: "rgba(22, 163, 74, 0.22)",
  },
  petDataBlock: {
    gap: 20,
  },
});
