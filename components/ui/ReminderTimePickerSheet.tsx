import InlineTimePickerSheet from "@/components/ui/InlineTimePickerSheet";
import { type DateTimePickerEvent } from "@/components/ui/pickers/CrittrDateTimePicker";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { mergeWallClockOntoToday } from "@/utils/mergeWallClockOntoToday";
import { useCallback, useEffect, useState } from "react";
import { Modal, Platform } from "react-native";

type ReminderTimePickerSheetProps = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  /** Shown in the iOS sheet header */
  title?: string;
};

/**
 * Time picker for screens that are not already inside a Modal (e.g. add-activity).
 * Android uses the system dialog; iOS uses a Cancel/Done sheet so the spinner
 * can be dismissed. Draft state keeps Cancel from committing a partial scroll.
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
  const [draft, setDraft] = useState(() => mergeWallClockOntoToday(value));

  useEffect(() => {
    if (!visible) return;
    setDraft(mergeWallClockOntoToday(value));
  }, [visible, value]);

  const handleNativeChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === "android") {
        if (event.type === "set" && date) {
          onChange(mergeWallClockOntoToday(date));
        }
        onClose();
        return;
      }
      if (event.type === "dismissed") return;
      if (date) setDraft(mergeWallClockOntoToday(date));
    },
    [onChange, onClose],
  );

  const handleDone = useCallback(() => {
    onChange(mergeWallClockOntoToday(draft));
    onClose();
  }, [draft, onChange, onClose]);

  if (Platform.OS === "android") {
    return (
      <InlineTimePickerSheet
        visible={visible}
        value={draft}
        is24Hour={is24Hour}
        title={title}
        onNativeChange={handleNativeChange}
        onCancel={onClose}
        onConfirm={handleDone}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <InlineTimePickerSheet
        visible={visible}
        value={draft}
        is24Hour={is24Hour}
        title={title}
        onNativeChange={handleNativeChange}
        onCancel={onClose}
        onConfirm={handleDone}
      />
    </Modal>
  );
}
