import ActivityHistoryFilterBar from "@/components/ui/activity/ActivityHistoryFilterBar";
import ActivityHistoryRow from "@/components/ui/activity/ActivityHistoryRow";
import ActivityWeeklySummaryStrip from "@/components/ui/activity/ActivityWeeklySummaryStrip";
import PetPillSwitcher from "@/components/ui/pets/PetPillSwitcher";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  computeWeeklySummary,
  convertActivities,
  filterEntriesByDateKey,
  groupActivityHistory,
  type ActivityFilterCategory,
  type ActivityHistoryEntry,
} from "@/data/activityHistory";
import { activityFilterMenuItems } from "@/utils/activityHistoryFilters";
import type { PetSummary } from "@/types/ui";
import {
  useAllActivitiesQuery,
  usePetsQuery,
  useProfilesByIdsQuery,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import { buildActivityLoggerNameMap } from "@/utils/profileDisplay";
import { useAuthStore } from "@/stores/authStore";
import { useSetActivePetMutation } from "@/hooks/mutations/useSetActivePetMutation";
import { usePetStore } from "@/stores/petStore";
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

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push, replace } = useNavigationCooldown();
  const { petId: petIdParam } = useLocalSearchParams<{
    petId?: string | string[];
  }>();
  const petIdFromRoute = useMemo(() => {
    const p = petIdParam;
    if (p == null) return undefined;
    const s = Array.isArray(p) ? p[0] : p;
    return typeof s === "string" && s.length > 0 ? s : undefined;
  }, [petIdParam]);

  const activePetId = usePetStore((s) => s.activePetId);
  const setActivePetMutation = useSetActivePetMutation();
  const { data: dbPets, isLoading: isPetsLoading } = usePetsQuery();

  const effectivePetId = petIdFromRoute ?? activePetId ?? null;

  const resolvedPetIdForPerm = useMemo(() => {
    if (
      effectivePetId &&
      (dbPets ?? []).some(
        (p) => p.id === effectivePetId && isPetActiveForDashboard(p),
      )
    ) {
      return effectivePetId;
    }
    return (dbPets ?? []).find((p) => isPetActiveForDashboard(p))?.id ?? null;
  }, [effectivePetId, dbPets]);

  const activityPetType = useMemo(() => {
    if (!effectivePetId || !dbPets?.length) return null;
    return dbPets.find((p) => p.id === effectivePetId)?.pet_type ?? null;
  }, [effectivePetId, dbPets]);

  const canLogActivities = useCanPerformAction(
    resolvedPetIdForPerm,
    "can_log_activities",
  );

  const { data: rawActivities, isLoading: isActivitiesLoading } =
    useAllActivitiesQuery(effectivePetId ?? undefined);
  const currentUserId = useAuthStore((s) => s.session?.user?.id);

  const activityLoggerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of rawActivities ?? []) {
      if (a.logged_by) ids.add(a.logged_by);
    }
    return [...ids];
  }, [rawActivities]);

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
    if (dbPets?.length) usePetStore.getState().initActivePetFromList(dbPets);
  }, [dbPets]);

  /** Deep link / profile: focus a specific pet (including memorial when `petId` is in the URL). */
  useEffect(() => {
    if (!petIdFromRoute || !dbPets?.length) return;
    const p = dbPets.find((x) => x.id === petIdFromRoute);
    if (p && isPetActiveForDashboard(p)) setActivePetMutation.mutate(petIdFromRoute);
  }, [petIdFromRoute, dbPets, setActivePetMutation]);

  const pets: PetSummary[] = useMemo(
    () =>
      (dbPets ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        breed: p.breed ?? "",
        imageUrl: p.avatar_url,
      })),
    [dbPets],
  );

  const handleSwitchPet = useCallback(
    (id: string) => {
      setActivePetMutation.mutate(id);
      if (petIdFromRoute) {
        replace("/(logged-in)/activity" as Href);
      }
    },
    [setActivePetMutation, replace, petIdFromRoute],
  );

  const subtitleMonth = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const [filter, setFilter] = useState<ActivityFilterCategory>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [dateFilterYmd, setDateFilterYmd] = useState<string | null>(null);

  useEffect(() => {
    const allowed = new Set(
      activityFilterMenuItems(activityPetType).map((x) => x.id),
    );
    if (!allowed.has(filter)) setFilter("all");
  }, [activityPetType, filter]);

  const allEntries = useMemo(
    () =>
      convertActivities(rawActivities ?? [], loggerNameByUserId, currentUserId),
    [rawActivities, loggerNameByUserId, currentUserId],
  );

  const weeklySummary = useMemo(
    () => (rawActivities?.length ? computeWeeklySummary(rawActivities) : null),
    [rawActivities],
  );

  const sections: Section[] = useMemo(
    () =>
      groupActivityHistory(
        filterEntriesByDateKey(allEntries, dateFilterYmd),
        filter,
        newestFirst,
      ).map((s) => ({
        title: s.title,
        dateKey: s.dateKey,
        data: s.data,
      })),
    [allEntries, filter, newestFirst, dateFilterYmd],
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
    <View style={styles.root}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitles}>
              <Text style={styles.pageTitle}>Activity</Text>
              <Text style={styles.pageSubtitle}>{subtitleMonth}</Text>
            </View>
            {canLogActivities === true ? (
              <Pressable
                style={styles.fab}
                onPress={handleLogActivity}
                accessibilityRole="button"
                accessibilityLabel="Log activity"
              >
                <MaterialCommunityIcons
                  name="plus"
                  size={28}
                  color={Colors.white}
                />
              </Pressable>
            ) : (
              <View style={styles.fabSpacer} />
            )}
          </View>

          <PetPillSwitcher
            pets={pets}
            activePetId={effectivePetId}
            onSwitchPet={handleSwitchPet}
          />
        </View>
      </View>

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
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            {isActivitiesLoading ? (
              <ActivityIndicator size="large" color={Colors.orange} />
            ) : (
              <Text style={styles.emptyText}>
                {!isPetsLoading && dbPets?.length === 0
                  ? "Add a pet to see activity here."
                  : dateFilterYmd != null
                    ? "No activities on this date for this pet."
                    : "No activities yet for this pet."}
              </Text>
            )}
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: scrollInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
      />
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
    paddingBottom: 12,
  },
  list: {
    flex: 1,
  },
  listScrollHeader: {
    gap: 16,
    paddingTop: 12,
    paddingBottom: 8,
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
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  weekAtGlanceTitle: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    marginBottom: -8,
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
  fabSpacer: {
    width: 52,
    height: 52,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
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
