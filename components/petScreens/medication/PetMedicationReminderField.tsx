import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { Colors } from "@/constants/colors";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import { formatUserTime } from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { Pressable, Text, View } from "react-native";

const MAX_REMINDER_TIMES = 8;

type Props = {
  reminderDates: Date[];
  setReminderDates: Dispatch<SetStateAction<Date[]>>;
};

export default function PetMedicationReminderField({
  reminderDates,
  setReminderDates,
}: Props) {
  const { timeDisplay } = useUserDateTimePrefs();
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  const openPicker = useCallback((index: number) => {
    setPickerIndex(index);
  }, []);

  const closePicker = useCallback(() => {
    setPickerIndex(null);
  }, []);

  const setPickedTime = useCallback(
    (date: Date) => {
      setReminderDates((prev) =>
        pickerIndex == null
          ? prev
          : prev.map((d, i) => (i === pickerIndex ? date : d)),
      );
    },
    [pickerIndex, setReminderDates],
  );

  const addReminderTime = useCallback(() => {
    setReminderDates((prev) => {
      if (prev.length >= MAX_REMINDER_TIMES) return prev;
      const last = prev[prev.length - 1]!;
      const next = new Date(last);
      next.setHours((last.getHours() + 1) % 24, last.getMinutes(), 0, 0);
      return [...prev, next];
    });
  }, [setReminderDates]);

  const removeAt = useCallback(
    (index: number) => {
      setPickerIndex(null);
      setReminderDates((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((_, i) => i !== index);
      });
    },
    [setReminderDates],
  );

  const pickerValue =
    pickerIndex != null ? reminderDates[pickerIndex]! : reminderDates[0]!;

  return (
    <>
      <Text style={styles.fieldLabel}>Reminder time</Text>
      {reminderDates.map((d, i) => (
        <View key={i} style={styles.reminderTimeRow}>
          <Pressable
            style={[styles.timeBtn, styles.reminderTimeBtn]}
            onPress={() => openPicker(i)}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={22}
              color={Colors.orange}
            />
            <Text style={styles.timeBtnText}>
              {formatUserTime(d, timeDisplay)}
            </Text>
          </Pressable>
          {reminderDates.length > 1 ? (
            <Pressable
              onPress={() => removeAt(i)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Remove reminder time"
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color={Colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      ))}
      {reminderDates.length < MAX_REMINDER_TIMES ? (
        <Pressable
          onPress={addReminderTime}
          style={styles.addReminderBtn}
          accessibilityRole="button"
          accessibilityLabel="Add reminder time"
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={20}
            color={Colors.orange}
          />
          <Text style={styles.addReminderBtnText}>Add reminder time</Text>
        </Pressable>
      ) : null}
      <ReminderTimePickerSheet
        visible={pickerIndex !== null}
        value={pickerValue}
        onChange={setPickedTime}
        onClose={closePicker}
      />
    </>
  );
}
