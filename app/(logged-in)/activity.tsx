import ActivityFilterChips from "@/components/ui/activity/ActivityFilterChips";
import ActivityHistoryRow from "@/components/ui/activity/ActivityHistoryRow";
import ActivityWeeklySummaryStrip from "@/components/ui/activity/ActivityWeeklySummaryStrip";
import PetPillSwitcher from "@/components/ui/pets/PetPillSwitcher";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  computeWeeklySummary,
  convertActivities,
  groupActivityHistory,
  type ActivityFilterCategory,
  type ActivityHistoryEntry,
} from "@/data/activityHistory";
import type { Pet } from "@/data/mockDashboard";
import {
  useAllActivitiesQuery,
  usePetsQuery,
  useProfilesByIdsQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { buildActivityLoggerNameMap } from "@/lib/profileDisplay";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const { activePetId, setActivePet } = usePetStore();
  const { data: dbPets, isLoading: isPetsLoading } = usePetsQuery();
  const { data: rawActivities, isLoading: isActivitiesLoading } =
    useAllActivitiesQuery(activePetId);
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

  const handleSwitchPet = useCallback(
    (id: string) => {
      setActivePet(id);
    },
    [setActivePet],
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
      groupActivityHistory(allEntries, filter, newestFirst).map((s) => ({
        title: s.title,
        dateKey: s.dateKey,
        data: s.data,
      })),
    [allEntries, filter, newestFirst],
  );

  const entryCount = useMemo(
    () => sections.reduce((n, s) => n + s.data.length, 0),
    [sections],
  );

  const handleLogActivity = useCallback(() => {
    router.push("/(logged-in)/add-activity");
  }, [router]);

  const openActivityEditor = useCallback(
    (activityId: string) => {
      router.push(`/(logged-in)/manage-activity-item/${activityId}` as Href);
    },
    [router],
  );

  const listHeader = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.headerTitles}>
          <Text style={styles.pageTitle}>Activity</Text>
          <Text style={styles.pageSubtitle}>{subtitleMonth}</Text>
        </View>
        <Pressable
          style={styles.fab}
          onPress={handleLogActivity}
          accessibilityRole="button"
          accessibilityLabel="Log activity"
        >
          <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
        </Pressable>
      </View>

      <PetPillSwitcher
        pets={pets}
        activePetId={activePetId}
        onSwitchPet={handleSwitchPet}
      />

      {weeklySummary ? (
        <>
          <Text style={styles.weekAtGlanceTitle}>Week at a glance</Text>
          <ActivityWeeklySummaryStrip summary={weeklySummary} />
        </>
      ) : null}

      <ActivityFilterChips active={filter} onChange={setFilter} />

      {/* <View style={styles.listMetaRow}>
        <Text style={styles.entryCount}>
          {entryCount} {entryCount === 1 ? "ENTRY" : "ENTRIES"}
        </Text>
      </View> */}
    </>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View style={styles.stickyHeader}>
            <Text style={styles.sectionHeading}>{section.title}</Text>
            <Pressable
              style={styles.sortBtn}
              onPress={() => setNewestFirst((v) => !v)}
              hitSlop={8}
            >
              <Text style={styles.sortText}>
                {newestFirst ? "Newest first" : "Oldest first"}
              </Text>
              <MaterialCommunityIcons
                name="sort-reverse-variant"
                size={18}
                color={Colors.orange}
              />
            </Pressable>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <ActivityHistoryRow
              entry={item}
              onPress={() => openActivityEditor(item.id)}
            />
          </View>
        )}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <View style={styles.listHeaderInner}>{listHeader}</View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            {isActivitiesLoading ? (
              <ActivityIndicator size="large" color={Colors.orange} />
            ) : (
              <Text style={styles.emptyText}>
                {!isPetsLoading && dbPets?.length === 0
                  ? "Add a pet to see activity here."
                  : "No activities match this filter."}
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
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  listHeaderInner: {
    gap: 16,
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
    fontSize: 28,
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
  listMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  entryCount: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: Colors.gray500,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sortText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  stickyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
