import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useProfilesByIdsQuery } from "@/hooks/queries";
import {
  buildActivityLoggerNameMap,
  resolveActivityLoggerLabel,
} from "@/lib/profileDisplay";
import type { PetActivity } from "@/types/database";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import OrangeButton from "../buttons/OrangeButton";
import ActivityItem from "./ActivityItem";
import SectionLabel from "./SectionLabel";

const PREVIEW_COUNT = 4;
const GAP = 8;

type ActivityFeedProps = {
  activities: PetActivity[];
  onLogActivityPress?: () => void;
  onSeeAllPress?: () => void;
};

export default function ActivityFeed({
  activities,
  onLogActivityPress,
  onSeeAllPress,
}: ActivityFeedProps) {
  const router = useRouter();
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const [expanded, setExpanded] = useState(false);

  const loggerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of activities) {
      if (a.logged_by) ids.add(a.logged_by);
    }
    return [...ids];
  }, [activities]);

  const { data: loggerProfiles, isSuccess: loggerProfilesReady } =
    useProfilesByIdsQuery(loggerIds);

  const nameByUserId = useMemo(
    () =>
      buildActivityLoggerNameMap(
        loggerProfiles,
        loggerIds,
        loggerProfilesReady,
      ),
    [loggerProfiles, loggerIds, loggerProfilesReady],
  );

  const sorted = [...activities].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  );
  const hasMore = sorted.length > PREVIEW_COUNT;
  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_COUNT);

  function toggle() {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setExpanded((prev) => !prev);
  }

  if (activities.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.listHeader}>
          <SectionLabel>Today's Activity</SectionLabel>
        </View>
        <TouchableOpacity
          style={styles.ctaCard}
          activeOpacity={0.9}
          onPress={onLogActivityPress}
        >
          <View style={styles.ctaTextBlock}>
            <Text style={styles.ctaTitle}>Log an activity</Text>
            <Text style={styles.ctaSubtitle}>No activities yet today</Text>
          </View>
          <View style={styles.ctaCircle}>
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={Colors.orange}
            />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <SectionLabel style={styles.sectionLabelFlush}>
          Today's Activity
        </SectionLabel>
        <View style={styles.headerRight}>
          {onSeeAllPress && (
            <Pressable onPress={onSeeAllPress} hitSlop={8}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <ActivityItem
            activity={item}
            loggerName={resolveActivityLoggerLabel(
              item.logged_by,
              nameByUserId,
              currentUserId,
            )}
            onPress={() =>
              router.push(
                `/(logged-in)/manage-activity-item/${item.id}` as Href,
              )
            }
          />
        )}
      />

      {hasMore && (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={toggle}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>
            {expanded ? "Show less" : `View all ${sorted.length} activities`}
          </Text>
        </TouchableOpacity>
      )}

      <OrangeButton
        style={styles.logAnotherCta}
        onPress={onLogActivityPress}
      >
        Log another activity
      </OrangeButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabelFlush: {
    marginBottom: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  seeAllText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.orange,
  },
  plusCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.orange,
    borderRadius: 28,
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  ctaTextBlock: {
    flex: 1,
    gap: 6,
  },
  ctaTitle: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  ctaSubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
  },
  ctaCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: "center",
  },
  viewAllText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  logAnotherCta: {
    marginTop: 10,
  },
});
