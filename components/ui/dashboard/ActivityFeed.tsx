import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ActivityEntry } from "@/data/mockDashboard";
import { detectUse12Hour, formatHour } from "@/utils/formatting";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ActivityItem from "./ActivityItem";
import SectionLabel from "./SectionLabel";

const PREVIEW_COUNT = 4;
const GAP = 8;

type ActivityFeedProps = {
  activities: ActivityEntry[];
  date: string;
  onLogActivityPress?: () => void;
};

export default function ActivityFeed({
  activities,
  date,
  onLogActivityPress,
}: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const use12h = detectUse12Hour();

  const sorted = [...activities].sort((a, b) => b.hour - a.hour);
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
          <SectionLabel>Activity</SectionLabel>
          <Text style={styles.dateHint}>{date}</Text>
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
        <SectionLabel>Activity</SectionLabel>
        <Text style={styles.dateHint}>{date}</Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <ActivityItem
            category={item.category}
            segments={item.segments}
            timeLabel={formatHour(item.hour, use12h)}
            loggedBy={item.loggedBy}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  listHeader: {
    marginBottom: 8,
  },
  dateHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: -4,
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
    borderColor: Colors.black,
    backgroundColor: Colors.skyLight,
    alignItems: "center",
  },
  viewAllText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.black,
  },
});
