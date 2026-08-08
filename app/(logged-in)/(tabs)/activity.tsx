import DashboardHeader from "@/components/ui/dashboard/DashboardHeader";
import ScheduleDateSelector from "@/components/ui/schedule/ScheduleDateSelector";
import ScheduleDaySkeleton from "@/components/ui/schedule/ScheduleDaySkeleton";
import SchedulePeriodSection from "@/components/ui/schedule/SchedulePeriodSection";
import { Colors } from "@/theme/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/theme/typography";
import {
  usePetDetailsQuery,
  useUnreadNotificationCountQuery,
} from "@/hooks/queries";
import { scheduleDayKey } from "@/hooks/queries/queryKeys";
import {
  refetchScheduleDayForced,
  useCompleteScheduleItemMutation,
  useScheduleDayQuery,
  useUncompleteScheduleItemMutation,
  useWarmScheduleCache,
} from "@/hooks/queries/useScheduleQuery";
import { useActivePet } from "@/hooks/useActivePet";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useSignupYmd } from "@/hooks/useSignupYmd";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { queryClient } from "@/lib/queryClient";
import type { PetScheduleItem } from "@/types/database";
import { getLocalYmd } from "@/utils/localCalendarDate";
import {
  periodForScheduledTime,
  SCHEDULE_PERIOD_LABELS,
  SCHEDULE_PERIOD_ORDER,
  type SchedulePeriod,
} from "@/utils/schedulePeriods";
import { dateLocaleFor } from "@/utils/userDateTimeFormat";
import type { Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatScheduleHeaderDate(
  ymd: string,
  dateDisplay: "mdy" | "dmy",
): { weekday: string; dateLine: string } {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  const locale = dateLocaleFor(dateDisplay);
  return {
    weekday: dt.toLocaleDateString(locale, { weekday: "long" }),
    dateLine: dt.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push } = useNavigationCooldown();
  const { dateDisplay } = useUserDateTimePrefs();
  const todayYmd = useLocalCalendarYmd();
  const signupYmd = useSignupYmd();
  const { data: unreadCount = 0, refetch: refetchUnreadCount } =
    useUnreadNotificationCountQuery();

  const { activePetId, pets, petsLoaded, hasNoPets, switchPet } =
    useActivePet();

  const [selectedYmd, setSelectedYmd] = useState(todayYmd);

  useEffect(() => {
    // Roll selected day forward if the device crosses midnight while parked on "today".
    setSelectedYmd((prev) => (prev === getLocalYmd() ? todayYmd : prev));
  }, [todayYmd]);

  const petIds = useMemo(() => pets.map((p) => p.id), [pets]);
  /** Switching pets should hit cache, not a fetch — keep the others warm. */
  useWarmScheduleCache(petIds, selectedYmd);

  const { data: petDetails } = usePetDetailsQuery(activePetId);
  const canLog = useCanPerformAction(activePetId, "can_log_activities");

  const {
    data: scheduleItems,
    isPending: isSchedulePending,
    isFetching: isScheduleFetching,
    isError: isScheduleError,
    refetch: refetchSchedule,
  } = useScheduleDayQuery(activePetId, selectedYmd);

  const completeMutation = useCompleteScheduleItemMutation();
  const uncompleteMutation = useUncompleteScheduleItemMutation();
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const headerDate = useMemo(
    () => formatScheduleHeaderDate(selectedYmd, dateDisplay),
    [selectedYmd, dateDisplay],
  );

  const grouped = useMemo(() => {
    const buckets: Record<SchedulePeriod, PetScheduleItem[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };
    for (const item of scheduleItems ?? []) {
      buckets[periodForScheduledTime(item.scheduled_time)].push(item);
    }
    return buckets;
  }, [scheduleItems]);

  const periodStaggerStarts = useMemo(() => {
    const starts: Record<SchedulePeriod, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
    };
    let running = 0;
    for (const period of SCHEDULE_PERIOD_ORDER) {
      starts[period] = running;
      running += grouped[period].length;
    }
    return starts;
  }, [grouped]);

  const scheduleAnimationKey = `${activePetId ?? ""}:${selectedYmd}`;

  const handleToggle = useCallback(
    (item: PetScheduleItem) => {
      if (canLog !== true) return;

      const key = scheduleDayKey(item.pet_id, item.local_date);
      const cached = queryClient.getQueryData<PetScheduleItem[]>(key);
      const latest = cached?.find((row) => row.id === item.id) ?? item;

      const pendingCompleteId = completeMutation.isPending
        ? completeMutation.variables?.item.id
        : null;
      const pendingUncompleteId = uncompleteMutation.isPending
        ? uncompleteMutation.variables?.item.id
        : null;
      if (
        pendingCompleteId === latest.id ||
        pendingUncompleteId === latest.id
      ) {
        return;
      }

      if (latest.completed_at) {
        uncompleteMutation.mutate({ item: latest });
      } else {
        completeMutation.mutate({ item: latest });
      }
    },
    [canLog, completeMutation, uncompleteMutation],
  );

  const handleEdit = useCallback(
    (item: PetScheduleItem) => {
      if (item.activity_id) {
        push(`/(logged-in)/manage-activity-item/${item.activity_id}` as Href);
        return;
      }
      if (item.source_kind === "vet_visit" && item.source_id) {
        push(
          `/(logged-in)/pet/${item.pet_id}/vet-visits/${item.source_id}` as Href,
        );
      }
    },
    [push],
  );

  const handlePullRefresh = useCallback(async () => {
    if (!activePetId) return;
    setPullRefreshing(true);
    try {
      await refetchScheduleDayForced(activePetId, selectedYmd);
    } catch {
      /** The error state already covers this; a failed pull shouldn't crash. */
    } finally {
      setPullRefreshing(false);
    }
  }, [activePetId, selectedYmd]);

  const petType = petDetails?.pet_type ?? null;
  const hasAnyItems = (scheduleItems?.length ?? 0) > 0;
  /**
   * Chrome (title / pets / dates) always paints. Only the body waits on data.
   * Cached schedule rows show immediately; a background reconcile may follow.
   */
  const showContentLoading =
    !scheduleItems &&
    !isScheduleError &&
    (!petsLoaded || !activePetId || isSchedulePending || isScheduleFetching);

  /** Without this a failed fetch is indistinguishable from an empty day. */
  const showError = !!activePetId && !scheduleItems && isScheduleError;

  return (
    <View style={styles.root}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerTitles}>
            {/* <Text style={styles.weekday} numberOfLines={1}>
              {headerDate.weekday}
            </Text>
            <Text style={styles.dateLine} numberOfLines={1}>
              {headerDate.dateLine}
            </Text> */}
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

          {/* <PetPillSwitcher
            pets={pets}
            activePetId={activePetId}
            onSwitchPet={switchPet}
          /> */}

          <ScheduleDateSelector
            selectedYmd={selectedYmd}
            todayYmd={todayYmd}
            signupYmd={signupYmd}
            onSelectYmd={setSelectedYmd}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={() => void handlePullRefresh()}
            tintColor={Colors.orange}
          />
        }
      >
        {hasNoPets ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>
              Add a pet to see their schedule here.
            </Text>
          </View>
        ) : showContentLoading ? (
          <ScheduleDaySkeleton />
        ) : showError ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>
              We couldn&apos;t load this day&apos;s schedule.
            </Text>
            <Text
              style={styles.retryText}
              accessibilityRole="button"
              onPress={() => void refetchSchedule()}
            >
              Tap to try again
            </Text>
          </View>
        ) : !hasAnyItems ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>
              Nothing scheduled for this day. Add meals, medications, or
              activities on your pet&apos;s profile.
            </Text>
          </View>
        ) : (
          <View style={styles.periods}>
            {SCHEDULE_PERIOD_ORDER.map((period) => (
              <SchedulePeriodSection
                key={`${scheduleAnimationKey}:${period}`}
                title={SCHEDULE_PERIOD_LABELS[period]}
                items={grouped[period]}
                petType={petType}
                animationKey={scheduleAnimationKey}
                staggerStartIndex={periodStaggerStarts[period]}
                onToggleComplete={handleToggle}
                onEdit={handleEdit}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
    gap: 16,
    paddingBottom: 14,
  },
  headerTitles: {
    minWidth: 0,
  },
  weekday: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  dateLine: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    flexGrow: 1,
  },
  periods: {
    gap: 16,
    overflow: "visible",
    paddingTop: 6,
  },
  emptyBlock: {
    paddingVertical: 48,
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  retryText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.orange,
    textAlign: "center",
  },
});
