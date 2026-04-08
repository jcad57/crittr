import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { MealPortionDraft } from "@/lib/petFood";
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
  StyleSheet,
  Text,
  View,
} from "react-native";

const IOS_PICKER_PROPS = {
  themeVariant: "light" as const,
  textColor: Colors.black,
};

const PORTION_UNITS = ["Cups", "Ounces", "Piece(s)"] as const;

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
  const [portionSize, setPortionSize] = useState("");
  const [portionUnit, setPortionUnit] = useState<string>("Cups");
  const [feedTime, setFeedTime] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible || !initial) return;
    setPortionSize(initial.portionSize);
    setPortionUnit(initial.portionUnit);
    setFeedTime(new Date(initial.feedTime.getTime()));
    setAttempted(false);
  }, [visible, initial]);

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

  const timeLabel = feedTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const onTimePickerChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "set" && date) {
          setFeedTime(date);
        }
        setTimePickerOpen(false);
        return;
      }
      if (date) setFeedTime(date);
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
              onPress={() => {
                Keyboard.dismiss();
                setTimePickerOpen(true);
              }}
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

        {/*
          Time UI must live inside this same Modal. A second Modal (e.g. ReminderTimePickerSheet)
          does not show reliably on iOS when the parent is already a Modal.
        */}
        {timePickerOpen && Platform.OS === "android" ? (
          <DateTimePicker
            value={feedTime}
            mode="time"
            display="default"
            onChange={onTimePickerChange}
            positiveButton={{ label: "OK", textColor: Colors.black }}
            negativeButton={{ label: "Cancel", textColor: Colors.black }}
          />
        ) : null}

        {timePickerOpen && Platform.OS !== "android" ? (
          <View style={styles.timeOverlay} pointerEvents="box-none">
            <Pressable
              style={styles.timeBackdrop}
              onPress={() => setTimePickerOpen(false)}
            />
            <View style={styles.timeSheet}>
              <View style={styles.timeToolbar}>
                <View style={styles.timeToolbarSide}>
                  <Pressable
                    onPress={() => setTimePickerOpen(false)}
                    hitSlop={12}
                  >
                    <Text style={styles.timeToolbarBtn}>Cancel</Text>
                  </Pressable>
                </View>
                <Text style={styles.timeToolbarTitle} numberOfLines={1}>
                  Feeding time
                </Text>
                <View style={[styles.timeToolbarSide, styles.timeToolbarSideEnd]}>
                  <Pressable
                    onPress={() => setTimePickerOpen(false)}
                    hitSlop={12}
                  >
                    <Text style={[styles.timeToolbarBtn, styles.timeToolbarDone]}>
                      Done
                    </Text>
                  </Pressable>
                </View>
              </View>
              <DateTimePicker
                value={feedTime}
                mode="time"
                display="spinner"
                onChange={onTimePickerChange}
                {...IOS_PICKER_PROPS}
                style={styles.iosPicker}
              />
            </View>
          </View>
        ) : null}
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
  timeToolbarSide: {
    width: 80,
    justifyContent: "center",
  },
  timeToolbarSideEnd: {
    alignItems: "flex-end",
  },
  timeToolbarBtn: {
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textSecondary,
    paddingHorizontal: 12,
  },
  timeToolbarDone: {
    color: Colors.orange,
    textAlign: "right",
  },
  timeToolbarTitle: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.black,
    textAlign: "center",
  },
  iosPicker: {
    backgroundColor: Colors.white,
    alignSelf: "center",
  },
});
