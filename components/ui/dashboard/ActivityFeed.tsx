import { Colors } from "@/constants/colors";
import type { ActivityEntry } from "@/data/mockDashboard";
import { detectUse12Hour, formatHour } from "@/utils/formatting";
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
import SectionHeader from "./SectionHeader";

// ─── Component ────────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 4;
const GAP = 8;

type ActivityFeedProps = {
  activities: ActivityEntry[];
  date: string;
  onMorePress?: () => void;
};

export default function ActivityFeed({
  activities,
  date,
  onMorePress,
}: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const use12h = detectUse12Hour();

  // Always sort most-recent first
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
        <SectionHeader
          title="Activity"
          subtitle={date}
          onMorePress={onMorePress}
        />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No activities logged today</Text>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.7}>
            <Text style={styles.addButtonText}>+ Add An Activity</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Activity"
        subtitle={date}
        onMorePress={onMorePress}
      />

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
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
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.black,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 16,
  },
  emptyText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  addButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.orange,
  },
});
