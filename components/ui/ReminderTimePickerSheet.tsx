import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useCallback } from "react";
import {
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

type ReminderTimePickerSheetProps = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  /** Shown in the iOS sheet header */
  title?: string;
};

/**
 * Time picker for medication reminders: black text on iOS, and on iOS a sheet
 * with Cancel / Done so the spinner can be dismissed (native spinner stays open otherwise).
 */
export default function ReminderTimePickerSheet({
  visible,
  value,
  onChange,
  onClose,
  title = "Reminder time",
}: ReminderTimePickerSheetProps) {
  const { timeDisplay } = useUserDateTimePrefs();
  const is24Hour = timeDisplay === "24h";
  const handleNativeChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "set" && date) {
          onChange(date);
        }
        onClose();
        return;
      }
      if (date) onChange(date);
    },
    [onChange, onClose],
  );

  if (Platform.OS === "android") {
    return visible ? (
      <DateTimePicker
        value={value}
        mode="time"
        display="default"
        is24Hour={is24Hour}
        onChange={handleNativeChange}
        positiveButton={{ label: "OK", textColor: Colors.black }}
        negativeButton={{ label: "Cancel", textColor: Colors.black }}
      />
    ) : null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.iosRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.toolbar}>
            <View style={styles.toolbarSide}>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.toolbarBtn}>Cancel</Text>
              </Pressable>
            </View>
            <Text style={styles.toolbarTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.toolbarSide, styles.toolbarSideEnd]}>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={[styles.toolbarBtn, styles.done]}>Done</Text>
              </Pressable>
            </View>
          </View>
          <DateTimePicker
            value={value}
            mode="time"
            display="spinner"
            is24Hour={is24Hour}
            onChange={handleNativeChange}
            {...IOS_PICKER_PROPS}
            style={styles.iosPicker}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  iosRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  toolbarSide: {
    width: 80,
    justifyContent: "center",
  },
  toolbarSideEnd: {
    alignItems: "flex-end",
  },
  toolbarBtn: {
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textSecondary,
    paddingHorizontal: 12,
  },
  done: {
    color: Colors.orange,
    textAlign: "right",
  },
  toolbarTitle: {
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
