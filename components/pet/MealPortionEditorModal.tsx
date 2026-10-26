import FormInput from "@/components/ui/form/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import InlineTimePickerSheet from "@/components/ui/InlineTimePickerSheet";
import { Colors } from "@/theme/colors";
import { PORTION_UNITS } from "@/constants/petFoodFormConstants";
import { Font } from "@/theme/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { mergeWallClockOntoToday } from "@/utils/mergeWallClockOntoToday";
import type { MealPortionDraft } from "@/utils/petFood";
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

type MealPortionEditorModalProps = {
  visible: boolean;
  title: string;
  initial: MealPortionDraft | null;
  onClose: () => void;
  onSave: (draft: MealPortionDraft) => void;
};

export default function MealPortionEditorModal({
  visible,
  title,
  initial,
  onClose,
  onSave,
}: MealPortionEditorModalProps) {
  const { timeDisplay } = useUserDateTimePrefs();
  const is24Hour = timeDisplay === "24h";
  const [portionSize, setPortionSize] = useState("");
  const [portionUnit, setPortionUnit] = useState<string>("Cups");
  const [feedTime, setFeedTime] = useState(() => {
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
    setPortionSize(initial.portionSize);
    setPortionUnit(initial.portionUnit);
    setFeedTime(new Date(initial.feedTime.getTime()));
    setTimePickerOpen(false);
    setAttempted(false);
  }, [visible, initial]);

  const openTimePicker = useCallback(() => {
    Keyboard.dismiss();
    setTimeDraft(mergeWallClockOntoToday(feedTime));
    setTimePickerOpen(true);
  }, [feedTime]);

  const closeTimePicker = useCallback(() => {
    setTimePickerOpen(false);
  }, []);

  const confirmTimePicker = useCallback(() => {
    setFeedTime(mergeWallClockOntoToday(timeDraft));
    setTimePickerOpen(false);
  }, [timeDraft]);

  const handleSave = useCallback(() => {
    setAttempted(true);
    if (!portionSize.trim()) return;
    if (!initial) return;
    Keyboard.dismiss();
    onSave({
      ...initial,
      portionSize: portionSize.trim(),
      portionUnit,
      feedTime,
    });
    onClose();
  }, [portionSize, portionUnit, feedTime, initial, onSave, onClose]);

  const timeLabel = formatUserTime(feedTime, timeDisplay);
  const iosTimePickerOpen = timePickerOpen && Platform.OS !== "android";
  const showForm = visible && !iosTimePickerOpen;

  const onTimePickerChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "set" && date) {
          setFeedTime(mergeWallClockOntoToday(date));
        }
        setTimePickerOpen(false);
        return;
      }
      if (event.type === "dismissed") return;
      if (date) setTimeDraft(mergeWallClockOntoToday(date));
    },
    [],
  );

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
          <Pressable
            style={styles.sheet}
            onPress={Keyboard.dismiss}
          >
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

            <Text style={styles.fieldLabel}>Portion</Text>
            <View style={styles.row2}>
              <FormInput
                placeholder="Amount"
                value={portionSize}
                onChangeText={setPortionSize}
                keyboardType="decimal-pad"
                containerStyle={styles.portionAmt}
              />
              <View style={styles.portionUnits}>
                {PORTION_UNITS.map((unit, i) => (
                  <Pressable
                    key={unit}
                    style={[
                      styles.unitChip,
                      i < PORTION_UNITS.length - 1 && styles.unitChipBorder,
                      portionUnit === unit && styles.unitChipActive,
                    ]}
                    onPress={() => setPortionUnit(unit)}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        portionUnit === unit && styles.unitChipTextActive,
                      ]}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            {attempted && !portionSize.trim() ? (
              <Text style={styles.fieldError}>Enter an amount.</Text>
            ) : null}

            <Text style={styles.fieldLabel}>Feeding time</Text>
            <Pressable
              style={styles.timeRow}
              onPress={openTimePicker}
            >
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
              Save portion
            </OrangeButton>
          </Pressable>
        </View>
        ) : null}

        <InlineTimePickerSheet
          visible={timePickerOpen}
          value={timeDraft}
          is24Hour={is24Hour}
          title="Feeding time"
          onNativeChange={onTimePickerChange}
          onCancel={closeTimePicker}
          onConfirm={confirmTimePicker}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  fieldError: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "stretch",
  },
  portionAmt: {
    width: 100,
    marginBottom: 0,
  },
  portionUnits: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 50,
  },
  unitChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  unitChipBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  unitChipActive: {
    backgroundColor: Colors.orangeLight,
  },
  unitChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  unitChipTextActive: {
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
});
