import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/theme/colors";
import {
  IOS_LIGHT_PICKER_PROPS,
  iosSpinnerPickerStyle,
} from "@/theme/dateTimePicker";
import { Font } from "@/theme/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import {
  EXERCISE_DOW_OPTIONS,
  isExercisePlanDraftValid,
  type ExercisePlanDraft,
} from "@/utils/exercisePlans";
import { mergeWallClockOntoToday } from "@/utils/mergeWallClockOntoToday";
import { formatUserTime } from "@/utils/userDateTimeFormat";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  initial: ExercisePlanDraft | null;
  onClose: () => void;
  onSave: (draft: ExercisePlanDraft) => void;
};

export default function ExercisePlanEditorModal({
  visible,
  title,
  initial,
  onClose,
  onSave,
}: Props) {
  const { timeDisplay } = useUserDateTimePrefs();
  const is24Hour = timeDisplay === "24h";
  const [label, setLabel] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [notes, setNotes] = useState("");
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible || !initial) return;
    setLabel(initial.label);
    setDaysOfWeek([...initial.daysOfWeek]);
    setScheduledTime(new Date(initial.scheduledTime.getTime()));
    setNotes(initial.notes);
    setTimePickerOpen(false);
    setAttempted(false);
  }, [visible, initial]);

  const toggleDay = useCallback((day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }, []);

  const openTimePicker = useCallback(() => {
    Keyboard.dismiss();
    setTimeDraft(mergeWallClockOntoToday(scheduledTime));
    setTimePickerOpen(true);
  }, [scheduledTime]);

  const closeTimePicker = useCallback(() => {
    setTimePickerOpen(false);
  }, []);

  const confirmTimePicker = useCallback(() => {
    setScheduledTime(mergeWallClockOntoToday(timeDraft));
    setTimePickerOpen(false);
  }, [timeDraft]);

  const handleSave = useCallback(() => {
    setAttempted(true);
    if (!initial) return;
    const draft: ExercisePlanDraft = {
      ...initial,
      label: label.trim(),
      daysOfWeek: [...daysOfWeek].sort((a, b) => a - b),
      scheduledTime,
      notes: notes.trim(),
    };
    if (!isExercisePlanDraftValid(draft)) return;
    Keyboard.dismiss();
    onSave(draft);
    onClose();
  }, [initial, label, daysOfWeek, scheduledTime, notes, onSave, onClose]);

  const timeLabel = formatUserTime(scheduledTime, timeDisplay);
  const labelErr = attempted && !label.trim();
  const daysErr = attempted && daysOfWeek.length === 0;

  const onTimePickerChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "set" && date) {
          setScheduledTime(mergeWallClockOntoToday(date));
        }
        setTimePickerOpen(false);
        return;
      }
      if (event.type === "dismissed") return;
      if (date) setTimeDraft(mergeWallClockOntoToday(date));
    },
    [],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        Keyboard.dismiss();
        onClose();
      }}
    >
      <View style={styles.modalRoot}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            accessibilityLabel="Dismiss"
          />
          <Pressable style={styles.sheet} onPress={Keyboard.dismiss}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                hitSlop={12}
                accessibilityLabel="Close"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={Colors.gray600}
                />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormInput
                label="Label"
                required
                placeholder="Walk, dog park, playtime…"
                value={label}
                onChangeText={setLabel}
                autoCapitalize="sentences"
                containerStyle={styles.field}
                error={labelErr}
              />

              <Text
                style={[styles.fieldLabel, daysErr && styles.fieldLabelError]}
              >
                Days of week *
              </Text>
              <View style={styles.daysRow}>
                {EXERCISE_DOW_OPTIONS.map((opt) => {
                  const active = daysOfWeek.includes(opt.value);
                  return (
                    <Pressable
                      key={opt.value}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => toggleDay(opt.value)}
                    >
                      <Text
                        style={[
                          styles.dayChipText,
                          active && styles.dayChipTextActive,
                        ]}
                      >
                        {opt.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {daysErr ? (
                <Text style={styles.fieldError}>Pick at least one day.</Text>
              ) : null}

              <Text style={styles.fieldLabel}>Time</Text>
              <Pressable style={styles.timeRow} onPress={openTimePicker}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={22}
                  color={Colors.orange}
                />
                <Text style={styles.timeRowText}>{timeLabel}</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={Colors.gray400}
                />
              </Pressable>

              <FormInput
                label="Notes"
                placeholder="Optional notes"
                value={notes}
                onChangeText={setNotes}
                multiline
                containerStyle={styles.field}
              />

              <OrangeButton style={styles.saveBtn} onPress={handleSave}>
                Save activity
              </OrangeButton>
            </ScrollView>
          </Pressable>
        </View>

        {timePickerOpen && Platform.OS === "android" ? (
          <DateTimePicker
            value={timeDraft}
            mode="time"
            display="default"
            is24Hour={is24Hour}
            onChange={onTimePickerChange}
            positiveButton={{ label: "OK", textColor: Colors.black }}
            negativeButton={{ label: "Cancel", textColor: Colors.black }}
          />
        ) : null}

        {timePickerOpen && Platform.OS !== "android" ? (
          <View style={styles.timeOverlay} pointerEvents="box-none">
            <Pressable style={styles.timeBackdrop} onPress={closeTimePicker} />
            <View style={styles.timeSheet}>
              <View style={styles.timeToolbar}>
                <View style={styles.timeToolbarSide}>
                  <Pressable onPress={closeTimePicker} hitSlop={12}>
                    <Text style={styles.timeToolbarBtn}>Cancel</Text>
                  </Pressable>
                </View>
                <Text style={styles.timeToolbarTitle} numberOfLines={1}>
                  Time
                </Text>
                <View
                  style={[styles.timeToolbarSide, styles.timeToolbarSideEnd]}
                >
                  <Pressable onPress={confirmTimePicker} hitSlop={12}>
                    <Text
                      style={[styles.timeToolbarBtn, styles.timeToolbarDone]}
                    >
                      Done
                    </Text>
                  </Pressable>
                </View>
              </View>
              <DateTimePicker
                value={timeDraft}
                mode="time"
                display="spinner"
                is24Hour={is24Hour}
                onChange={onTimePickerChange}
                {...IOS_LIGHT_PICKER_PROPS}
                style={iosSpinnerPickerStyle}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: "90%",
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Colors.textPrimary,
    flex: 1,
  },
  field: { marginBottom: 12 },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: { color: Colors.error },
  fieldError: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    minWidth: 44,
    alignItems: "center",
  },
  dayChipActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  dayChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  dayChipTextActive: { color: Colors.orange },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
    marginBottom: 12,
  },
  timeRowText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  saveBtn: { marginTop: 4, marginBottom: 4 },
  timeOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 100,
  },
  timeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  timeSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    overflow: "hidden",
    zIndex: 101,
  },
  timeToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  timeToolbarSide: { width: 80, justifyContent: "center" },
  timeToolbarSideEnd: { alignItems: "flex-end" },
  timeToolbarBtn: {
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textSecondary,
    paddingHorizontal: 12,
  },
  timeToolbarDone: { color: Colors.orange, textAlign: "right" },
  timeToolbarTitle: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.black,
    textAlign: "center",
  },
});
