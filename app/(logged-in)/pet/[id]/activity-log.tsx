import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetActivityLogRow from "@/components/ui/pet/PetActivityLogRow";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  convertActivities,
  groupActivityHistory,
  type ActivityHistoryEntry,
} from "@/data/activityHistory";
import {
  useAllActivitiesQuery,
  usePetDetailsQuery,
  useProfilesByIdsQuery,
} from "@/hooks/queries";
import { useSetActivePetMutation } from "@/hooks/mutations/useSetActivePetMutation";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetScopedAfterSwitchPet } from "@/hooks/usePetScopedAfterSwitchPet";
import { buildActivityLoggerNameMap } from "@/utils/profileDisplay";
import { useAuthStore } from "@/stores/authStore";
import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo } from "react";
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

/** Matches `OrangeButton` wrapper height (50 + 5). */
const ORANGE_BUTTON_WRAPPER_HEIGHT = 55;

const BOTTOM_BAR_PADDING_TOP = 8;

export default function PetActivityLogScreen() {
  const insets = useSafeAreaInsets();
  const { push, replace, router } = useNavigationCooldown();
  const setActivePetMutation = useSetActivePetMutation();

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

  const { data: details, isLoading: loadingPet } =
    usePetDetailsQuery(petId);
  const { data: rawActivities, isLoading: isActivitiesLoading } =
    useAllActivitiesQuery(petId);
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

  const allEntries = useMemo(
    () =>
      convertActivities(rawActivities ?? [], loggerNameByUserId, currentUserId),
    [rawActivities, loggerNameByUserId, currentUserId],
  );

  const sections: Section[] = useMemo(
    () =>
      groupActivityHistory(allEntries, "all", true).map((s) => ({
        title: s.title,
        dateKey: s.dateKey,
        data: s.data,
      })),
    [allEntries],
  );

  const goToActivityTab = useCallback(() => {
    if (petId) setActivePetMutation.mutate(petId);
    push("/(logged-in)/activity" as Href);
  }, [petId, push, setActivePetMutation]);

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

  const listHeader = (
    <View style={styles.listHeader}>
      <Text style={styles.lead}>
        A quick read-only timeline for {details.name}. Log new entries or edit
        existing ones from the Activity tab.
      </Text>
    </View>
  );

  const listPaddingBottom =
    BOTTOM_BAR_PADDING_TOP + ORANGE_BUTTON_WRAPPER_HEIGHT + insets.bottom;

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Activity log
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Activity log for"
            onAfterSwitchPet={onPetSwitch}
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
        renderItem={({ item }) => <PetActivityLogRow entry={item} />}
        ItemSeparatorComponent={() => <View style={styles.rowSep} />}
        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.emptyBlock}>
            {isActivitiesLoading ? (
              <ActivityIndicator size="large" color={Colors.orange} />
            ) : (
              <Text style={styles.emptyText}>
                No activities yet for {details.name}.
              </Text>
            )}
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom },
        ]}
      >
        <OrangeButton
          onPress={goToActivityTab}
          accessibilityLabel="Open Activity tab to log or edit activities"
          accessibilityHint="Switches to the main Activity screen for this pet"
        >
          Manage in Activity
        </OrangeButton>
      </View>
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
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.creamDark,
    backgroundColor: Colors.cream,
  },
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  listHeader: {
    paddingTop: 6,
    paddingBottom: 2,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  stickyHeader: {
    backgroundColor: Colors.cream,
    paddingTop: 8,
    paddingBottom: 6,
  },
  sectionHeading: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: Colors.gray500,
  },
  sectionGap: {
    height: 6,
  },
  rowSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray100,
  },
  emptyBlock: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: BOTTOM_BAR_PADDING_TOP,
    backgroundColor: Colors.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.creamDark,
  },
});
