import {
  ACTIVITY_ROW_ICON_BOX,
  ACTIVITY_ROW_ICON_IMG,
  ACTIVITY_ROW_ICONS,
  resolveActivityRowIconSource,
} from "@/constants/activityRowIcons";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import type { PetScheduleItem } from "@/types/database";
import { formatFeedTimeLabel } from "@/utils/petFoodTime";
import { scheduleDisplayCategory } from "@/utils/schedulePeriods";
import { formatUserTime } from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  item: PetScheduleItem;
  petType?: string | null;
  onToggleComplete: () => void;
  onEdit?: () => void;
};

const CHECK_SIZE = 32;
const MENU_SIZE = 28;
/** Approx stamp height — used so half sits above the card’s top edge. */
const STAMP_HEIGHT = 20;

export default function ScheduleActivityCard({
  item,
  petType = null,
  onToggleComplete,
  onEdit,
}: Props) {
  const { timeDisplay } = useUserDateTimePrefs();
  const completed = !!item.completed_at;
  const isTreat =
    item.source_kind === "food_treat" || item.meta?.is_treat === true;
  const category = scheduleDisplayCategory(item.activity_type, isTreat);
  const iconCfg = ACTIVITY_ROW_ICONS[category];
  const iconSource = resolveActivityRowIconSource(category, petType);

  const menuProgress = useSharedValue(completed ? 1 : 0);
  const stampProgress = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    menuProgress.value = withTiming(completed ? 1 : 0, { duration: 220 });
    stampProgress.value = withTiming(completed ? 1 : 0, { duration: 180 });
  }, [completed, menuProgress, stampProgress]);

  const menuStyle = useAnimatedStyle(() => ({
    width: MENU_SIZE * menuProgress.value,
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * 8 },
      { scale: 0.9 + 0.1 * menuProgress.value },
    ],
    overflow: "hidden" as const,
  }));

  const stampStyle = useAnimatedStyle(() => ({
    opacity: stampProgress.value,
  }));

  const stamp =
    item.completed_at != null
      ? formatUserTime(new Date(item.completed_at), timeDisplay)
      : "";
  const scheduledTimeLabel = formatFeedTimeLabel(
    item.scheduled_time,
    timeDisplay,
  );

  return (
    <View style={styles.card}>
      {/* Centered on the top edge — half above the card, half below. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.stampEdge, stampStyle]}
      >
        {stamp ? (
          <View style={styles.stamp}>
            <Text style={styles.stampText} numberOfLines={1}>
              {stamp}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      <View style={[styles.iconBox, { backgroundColor: iconCfg.track }]}>
        <Image
          source={iconSource}
          style={styles.iconImg}
          tintColor={category === "maintenance" ? undefined : iconCfg.ring}
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>
          {item.label}
        </Text>
        {item.detail_line ? (
          <Text style={styles.detail} numberOfLines={1}>
            {item.detail_line}
          </Text>
        ) : null}
        {item.quantity_line ? (
          <Text style={styles.quantity} numberOfLines={1}>
            {scheduledTimeLabel} • {item.quantity_line}
          </Text>
        ) : (
          <Text style={styles.quantity} numberOfLines={1}>
            {scheduledTimeLabel}
          </Text>
        )}
      </View>

      <View style={styles.rightCol}>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onToggleComplete}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={completed ? "Mark incomplete" : "Mark complete"}
            style={({ pressed }) => [
              styles.checkBtn,
              completed ? styles.checkBtnDone : styles.checkBtnTodo,
              pressed && styles.checkPressed,
            ]}
          >
            <MaterialCommunityIcons
              name="check"
              size={18}
              color={Colors.white}
            />
          </Pressable>

          <Animated.View style={menuStyle}>
            <Pressable
              onPress={onEdit}
              disabled={!completed || !onEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit activity"
              style={styles.menuBtn}
            >
              <MaterialCommunityIcons
                name="dots-horizontal"
                size={22}
                color={Colors.gray500}
              />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
    overflow: "visible",
    position: "relative",
  },
  stampEdge: {
    position: "absolute",
    top: -(STAMP_HEIGHT / 2),
    // left: 0,
    right: 32,
    height: STAMP_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  stamp: {
    backgroundColor: Colors.orange,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink: 0,
  },
  stampText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    color: Colors.white,
  },
  iconBox: {
    width: ACTIVITY_ROW_ICON_BOX,
    height: ACTIVITY_ROW_ICON_BOX,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconImg: {
    width: ACTIVITY_ROW_ICON_IMG,
    height: ACTIVITY_ROW_ICON_IMG,
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  detail: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  quantity: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  checkBtn: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBtnTodo: {
    backgroundColor: Colors.gray300,
  },
  checkBtnDone: {
    backgroundColor: Colors.mint,
  },
  checkPressed: {
    opacity: 0.85,
  },
  menuBtn: {
    width: MENU_SIZE,
    height: MENU_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
