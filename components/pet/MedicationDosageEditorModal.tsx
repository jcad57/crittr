import FormInput from "@/components/ui/form/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import InlineTimePickerSheet from "@/components/ui/InlineTimePickerSheet";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { DOSAGE_TYPES } from "@/constants/medicationEditForm";
import { Font } from "@/theme/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { mergeWallClockOntoToday } from "@/utils/mergeWallClockOntoToday";
import type { MedicationDosageDraft } from "@/utils/medicationDosageDraft";
import { formatUserTime } from "@/utils/userDateTimeFormat";
import { type DateTimePickerEvent } from "@/components/ui/pickers/CrittrDateTimePicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type MedicationDosageEditorModalProps = {
  visible: boolean;
  title: string;
  initial: MedicationDosageDraft | null;
  onClose: () => void;
  onSave: (draft: MedicationDosageDraft) => void;
};

export default function MedicationDosageEditorModal({
  visible,
  title,
  initial,
  onClose,
  onSave,
}: MedicationDosageEditorModalProps) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const { timeDisplay } = useUserDateTimePrefs();
  const is24Hour = timeDisplay === "24h";
  const [dosageAmount, setDosageAmount] = useState("");
  const [dosageType, setDosageType] = useState<string>(DOSAGE_TYPES[0]!);
  const [reminderTime, setReminderTime] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible || !initial) return;
    const nextTime = new Date(initial.reminderTime.getTime());
    setDosageAmount(initial.dosageAmount);
    setDosageType(initial.dosageType || DOSAGE_TYPES[0]!);
    setReminderTime(nextTime);
    setTimeDraft(mergeWallClockOntoToday(nextTime));
    setTimePickerOpen(false);
    setAttempted(false);
  }, [visible, initial]);

  const openTimePicker = useCallback(() => {
    Keyboard.dismiss();
    setTimeDraft(mergeWallClockOntoToday(reminderTime));
    setTimePickerOpen(true);
  }, [reminderTime]);

  const closeTimePicker = useCallback(() => {
    setTimePickerOpen(false);
  }, []);

  const confirmTimePicker = useCallback(() => {
    setReminderTime(mergeWallClockOntoToday(timeDraft));
    setTimePickerOpen(false);
  }, [timeDraft]);

  const handleSave = useCallback(() => {
    setAttempted(true);
    if (!dosageAmount.trim() || !dosageType.trim()) return;
    if (!initial) return;
    Keyboard.dismiss();
    onSave({
      ...initial,
      dosageAmount: dosageAmount.trim(),
      dosageType,
      reminderTime: mergeWallClockOntoToday(reminderTime),
    });
    onClose();
  }, [dosageAmount, dosageType, reminderTime, initial, onSave, onClose]);

  const timeLabel = formatUserTime(reminderTime, timeDisplay);
  const amountError = attempted && !dosageAmount.trim();
  const typeError = attempted && !dosageType.trim();

  const onTimePickerChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "set" && date) {
          setReminderTime(mergeWallClockOntoToday(date));
        }
        setTimePickerOpen(false);
        return;
      }
      if (event.type === "dismissed") return;
      if (date) setTimeDraft(mergeWallClockOntoToday(date));
    },
    [],
  );

  const iosTimePickerOpen = timePickerOpen && Platform.OS !== "android";
  const showForm = visible && !iosTimePickerOpen;

  const handleRequestClose = useCallback(() => {
    Keyboard.dismiss();
    if (timePickerOpen) {
      setTimePickerOpen(false);
      return;
    }
    onClose();
  }, [timePickerOpen, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <View style={styles.modalRoot}>
        {showForm ? (
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

              <Text
                style={[
                  styles.fieldLabel,
                  (amountError || typeError) && styles.fieldLabelError,
                ]}
              >
                Dosage
              </Text>
              <FormInput
                placeholder="Amount"
                value={dosageAmount}
                onChangeText={setDosageAmount}
                keyboardType="default"
                containerStyle={styles.amountInput}
                error={amountError}
              />
              <View style={styles.typeWrap}>
                {DOSAGE_TYPES.map((unit) => (
                  <Pressable
                    key={unit}
                    style={[
                      styles.typeChip,
                      dosageType === unit && styles.typeChipActive,
                      typeError && !dosageType && styles.typeChipError,
                    ]}
                    onPress={() => setDosageType(unit)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        dosageType === unit && styles.typeChipTextActive,
                      ]}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {amountError ? (
                <Text style={styles.fieldError}>Enter an amount.</Text>
              ) : null}
              {typeError ? (
                <Text style={styles.fieldError}>Choose a dosage type.</Text>
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

              <OrangeButton style={styles.saveBtn} onPress={handleSave}>
                Save dosage
              </OrangeButton>
            </Pressable>
          </View>
        ) : null}

        <InlineTimePickerSheet
          visible={timePickerOpen}
          value={timeDraft}
          is24Hour={is24Hour}
          title="Dosage time"
          onNativeChange={onTimePickerChange}
          onCancel={closeTimePicker}
          onConfirm={confirmTimePicker}
        />
      </View>
    </Modal>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
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
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Colors.textPrimary,
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  fieldError: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  amountInput: {
    marginBottom: 10,
  },
  typeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  typeChipActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  typeChipError: {
    borderColor: Colors.error,
  },
  typeChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.orange,
  },
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
    marginBottom: 16,
  },
  timeRowText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  saveBtn: {
    marginTop: 4,
  },
}));
