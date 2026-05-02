import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { Colors } from "@/constants/colors";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { useActivityFormStore } from "@/stores/activityFormStore";
import { formatUserTime } from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

/** Merge picked clock time with today’s calendar date (local). */
export function mergeTodayLocalTime(timeSource: Date): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    0,
  );
}

/**
 * Lets the user optionally set when the activity occurred. If they never pick a
 * time, `activityOccurredAt` stays null and save uses the time at save.
 */
type Props = {
  /** Same as `FormInput` `containerStyle` (e.g. detail step `blockSpacing`). */
  containerStyle?: StyleProp<ViewStyle>;
};

export default function ActivityOccurredTimeRow({ containerStyle }: Props) {
  const { timeDisplay } = useUserDateTimePrefs();
  const activityOccurredAt = useActivityFormStore((s) => s.activityOccurredAt);
  const setActivityOccurredAt = useActivityFormStore(
    (s) => s.setActivityOccurredAt,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const pickerValue = activityOccurredAt ?? new Date();

  /** Custom time, or “now” for display when save will use current time. */
  const displayTime = formatUserTime(activityOccurredAt ?? new Date(), timeDisplay);

  const onPickerChange = useCallback(
    (d: Date) => {
      setActivityOccurredAt(mergeTodayLocalTime(d));
    },
    [setActivityOccurredAt],
  );

  return (
    <>
      <View style={containerStyle}>
        <Text style={styles.fieldLabel}>Time</Text>
        <Pressable
          style={({ pressed }) => [
            styles.inputRow,
            pressed && styles.inputPressed,
          ]}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Time activity occurred"
        >
          <Text style={styles.inputText}>{displayTime}</Text>
          <MaterialCommunityIcons
            name="clock-outline"
            size={20}
            color={Colors.gray400}
          />
        </Pressable>
      </View>
      <ReminderTimePickerSheet
        visible={pickerOpen}
        value={pickerValue}
        onChange={onPickerChange}
        onClose={() => setPickerOpen(false)}
        title="Activity time"
      />
    </>
  );
}

const styles = StyleSheet.create({
  /** Matches `FormInput` `fieldLabel`. */
  fieldLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  /** Matches `FormInput` single-line field container. */
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  inputPressed: {
    opacity: 0.88,
  },
  inputText: {
    flex: 1,
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
