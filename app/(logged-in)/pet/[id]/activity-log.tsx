import ScreenHeader from "@/components/ui/ScreenHeader";
import ActivityHistoryFilterBar from "@/components/ui/activity/ActivityHistoryFilterBar";
import ActivityHistoryRow from "@/components/ui/activity/ActivityHistoryRow";
import ActivityWeeklySummaryStrip from "@/components/ui/activity/ActivityWeeklySummaryStrip";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/theme/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/theme/typography";
import {
  computeWeeklySummary,
  convertActivities,
  groupActivityHistory,
  type ActivityFilterCategory,
  type ActivityHistoryEntry,
} from "@/data/activityHistory";
import { activityFilterMenuItems } from "@/utils/activityHistoryFilters";
import {
  useActivitiesOnDayQuery,
  useAllActivitiesQuery,
  usePetDetailsQuery,
  useProfilesByIdsQuery,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetScopedAfterSwitchPet } from "@/hooks/usePetScopedAfterSwitchPet";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { buildActivityLoggerNameMap } from "@/utils/profileDisplay";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Section = {
  title: string;
  dateKey: string;
  data: ActivityHistoryEntry[];
};

/**
 * Full activity history for a pet (formerly the Activity tab).
 * Reached from the pet profile “Activity history” row.
 */
export default function PetActivityHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { push, replace, router } = useNavigationCooldown();
  const { timeDisplay, dateDisplay } = useUserDateTimePrefs();

  const { id: petIdParam } = useLocalSearchParams<{
    id?: string | string[];
  }>();
  const petId = useMemo(() => {
    const p = petIdParam;
    if (p == null) return undefined;
    const s = Array.isArray(p) ? p[0] : p;
    return typeof s === "string" && s.length > 0 ? s : undefined;
  }, [petIdParam]);

  const onPetSwitch = usePetScopedAfterSwitchPet(petId, replace);

  const { data: details, isLoading: loadingPet } = usePetDetailsQuery(petId);
  const activityPetType = details?.pet_type ?? null;
  const canLogActivities = useCanPerformAction(petId, "can_log_activities");

  const [filter, setFilter] = useState<ActivityFilterCategory>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [dateFilterYmd, setDateFilterYmd] = useState<string | null>(null);

  const {
    data: rawActivities,
    isLoading: isActivitiesLoading,
    isFetchingNextPage: isLoadingMoreActivities,
    fetchNextPage: loadMoreActivities,
  } = useAllActivitiesQuery(petId);

  const { data: dayActivities, isLoading: isDayActivitiesLoading } =
    useActivitiesOnDayQuery(petId, dateFilterYmd);

  const visibleActivities = dateFilterYmd ? dayActivities : rawActivities;
  const currentUserId = useAuthStore((s) => s.session?.user?.id);

  const activityLoggerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of visibleActivities ?? []) {
      if (a.logged_by) ids.add(a.logged_by);
    }
    return [...ids];
  }, [visibleActivities]);

  const { data: loggerProfiles, isSuccess: loggerProfilesReady } =
    useProfilesByIdsQuery(activityLoggerIds);

  const loggerNameByUserId = useMemo(
    () =>
      buildActivityLoggerNameMap(
        loggerProfiles,
        activityLoggerIds,
        loggerProfilesReady,
      ),
    [loggerProfiles, activityLoggerIds, loggerProfilesReady],
  );

  useEffect(() => {
    const allowed = new Set(
      activityFilterMenuItems(activityPetType).map((x) => x.id),
    );
    if (!allowed.has(filter)) setFilter("all");
  }, [activityPetType, filter]);

  const allEntries = useMemo(
    () =>
      convertActivities(
        visibleActivities ?? [],
        loggerNameByUserId,
        currentUserId,
        timeDisplay,
      ),
    [visibleActivities, loggerNameByUserId, currentUserId, timeDisplay],
  );

  const weeklySummary = useMemo(
    () => (rawActivities?.length ? computeWeeklySummary(rawActivities) : null),
    [rawActivities],
  );

  const sections: Section[] = useMemo(
    () =>
      groupActivityHistory(allEntries, filter, newestFirst, dateDisplay).map(
        (s) => ({
          title: s.title,
          dateKey: s.dateKey,
          data: s.data,
        }),
      ),
    [allEntries, filter, newestFirst, dateDisplay],
  );

  const handleLogActivity = useCallback(() => {
    push("/(logged-in)/add-activity");
  }, [push]);

  const openActivityEditor = useCallback(
    (activityId: string) => {
      push(`/(logged-in)/manage-activity-item/${activityId}` as Href);
    },
    [push],
  );

  if (!petId) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.notFound}>Pet not found.</Text>
      </View>
    );
  }

  if (loadingPet) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 8 }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.notFound}>Pet not found.</Text>
      </View>
    );
  }

  const listScrollHeader = (
    <View style={styles.listScrollHeader}>
      {weeklySummary ? (
        <>
          <Text style={styles.weekAtGlanceTitle}>Week at a glance</Text>
          <ActivityWeeklySummaryStrip
            summary={weeklySummary}
            variant={activityPetType === "cat" ? "cat" : "default"}
          />
        </>
      ) : null}

      <ActivityHistoryFilterBar
        petType={activityPetType}
        filter={filter}
        onFilterChange={setFilter}
        newestFirst={newestFirst}
        onNewestFirstChange={setNewestFirst}
        dateFilterYmd={dateFilterYmd}
        onDateFilterChange={setDateFilterYmd}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Activity history"
        onBack={() => router.back()}
        topInset={insets.top + 8}
        right={
          canLogActivities === true ? (
            <Pressable
              style={styles.fab}
              onPress={handleLogActivity}
              accessibilityRole="button"
              accessibilityLabel="Log activity"
            >
              <MaterialCommunityIcons
                name="plus"
                size={22}
                color={Colors.white}
              />
            </Pressable>
          ) : (
            <PetNavAvatar
              displayPet={details}
              accessibilityLabelPrefix="Activity history for"
              onAfterSwitchPet={onPetSwitch}
            />
          )
        }
      />

      <SectionList
        style={styles.list}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.stickyHeader}>
            <Text style={styles.sectionHeading}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <ActivityHistoryRow
              entry={item}
              petType={activityPetType}
              onPress={() => openActivityEditor(item.id)}
            />
          </View>
        )}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={listScrollHeader}
        onEndReached={dateFilterYmd ? undefined : loadMoreActivities}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          isLoadingMoreActivities ? (
            <View style={styles.listFooter}>
              <ActivityIndicator size="small" color={Colors.orange} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            {isActivitiesLoading || isDayActivitiesLoading ? (
              <ActivityIndicator size="large" color={Colors.orange} />
            ) : (
              <Text style={styles.emptyText}>
                {dateFilterYmd != null
                  ? "No activities on this date for this pet."
                  : `No activities yet for ${details.name}.`}
              </Text>
            )}
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
  },
  notFound: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  fab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  listScrollHeader: {
    gap: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  weekAtGlanceTitle: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    marginBottom: -8,
  },
  listFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  stickyHeader: {
    backgroundColor: Colors.cream,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionHeading: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: Colors.gray500,
  },
  sectionGap: {
    height: 8,
  },
  rowWrap: {
    marginHorizontal: 0,
  },
  emptyBlock: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
