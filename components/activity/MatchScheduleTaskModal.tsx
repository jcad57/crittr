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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type MatchScheduleTaskModalProps = {
  visible: boolean;
  petName: string;
  petType?: string | null;
  items: PetScheduleItem[];
  /** Item currently being completed (disables other taps). */
  completingItemId?: string | null;
  onSelectItem: (item: PetScheduleItem) => void;
  onLogNewTask: () => void;
  onClose: () => void;
};

/**
 * Shown after Continue on the activity type step when the active pet has
 * uncompleted schedule tasks for the selected category (exercise / food / med / potty).
 */
export default function MatchScheduleTaskModal({
  visible,
  petName,
  petType = null,
  items,
  completingItemId = null,
  onSelectItem,
  onLogNewTask,
  onClose,
}: MatchScheduleTaskModalProps) {
  const { timeDisplay } = useUserDateTimePrefs();
  const displayName = petName.trim() || "your pet";
  const busy = completingItemId != null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={busy ? undefined : onClose}
      >
        <Pressable
          style={styles.modalCard}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.modalTitle}>
            {`Are you logging one of ${displayName}'s tasks below?`}
          </Text>
          <Text style={styles.modalHint}>
            Tap a scheduled task to mark it complete and add it to the activity
            feed.
          </Text>

          <ScrollView
            style={styles.modalList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const isTreat =
                item.source_kind === "food_treat" ||
                item.meta?.is_treat === true;
              const category = scheduleDisplayCategory(
                item.activity_type,
                isTreat,
              );
              const iconCfg = ACTIVITY_ROW_ICONS[category];
              const iconSource = resolveActivityRowIconSource(
                category,
                petType,
              );
              const timeLabel = formatFeedTimeLabel(
                item.scheduled_time,
                timeDisplay,
              );
              const isThisCompleting = completingItemId === item.id;

              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.taskRow,
                    pressed && !busy && styles.taskRowPressed,
                    busy && !isThisCompleting && styles.taskRowDimmed,
                  ]}
                  disabled={busy}
                  onPress={() => onSelectItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${item.label}`}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: iconCfg.track },
                    ]}
                  >
                    <Image
                      source={iconSource}
                      style={styles.iconImg}
                      tintColor={
                        category === "maintenance" ? undefined : iconCfg.ring
                      }
                    />
                  </View>
                  <View style={styles.taskBody}>
                    <Text style={styles.taskLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.detail_line ? (
                      <Text style={styles.taskDetail} numberOfLines={1}>
                        {item.detail_line}
                      </Text>
                    ) : null}
                    <Text style={styles.taskMeta} numberOfLines={1}>
                      {item.quantity_line
                        ? `${timeLabel} • ${item.quantity_line}`
                        : timeLabel}
                    </Text>
                  </View>
                  {isThisCompleting ? (
                    <ActivityIndicator size="small" color={Colors.orange} />
                  ) : (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color={Colors.gray400}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.newTaskBtn,
              pressed && !busy && styles.newTaskBtnPressed,
            ]}
            disabled={busy}
            onPress={onLogNewTask}
            accessibilityRole="button"
            accessibilityLabel="I'm logging a new task"
          >
            <Text style={styles.newTaskBtnText}>{"I'm logging a new task"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 320,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  taskRowPressed: {
    opacity: 0.75,
  },
  taskRowDimmed: {
    opacity: 0.45,
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
  taskBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  taskLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  taskDetail: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  taskMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
  newTaskBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  newTaskBtnPressed: {
    opacity: 0.75,
  },
  newTaskBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
});
