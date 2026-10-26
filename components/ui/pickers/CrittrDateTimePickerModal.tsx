import { Colors } from "@/theme/colors";
import { MODAL_DATETIME_PICKER_PROPS } from "@/theme/dateTimePicker";
import { resolvePickerBounds } from "@/utils/dateTimePickerBounds";
import { useMemo } from "react";
import { Platform } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

export type CrittrDateTimePickerModalProps = {
  isVisible: boolean;
  mode: "date" | "time" | "datetime";
  date: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date | null;
  maximumDate?: Date | null;
  is24Hour?: boolean;
  /** Defaults to "Save"; override for filter-style sheets. */
  confirmTextIOS?: string;
};

/**
 * Every modal date/time sheet in the app. Owns the Crittr chrome (light
 * spinner, orange buttons) and, critically, always sends both bounds to the
 * native picker — omitting one pins the wheel to the Unix epoch, see
 * `utils/dateTimePickerBounds.ts`.
 */
export default function CrittrDateTimePickerModal({
  date,
  minimumDate,
  maximumDate,
  confirmTextIOS = "Save",
  ...rest
}: CrittrDateTimePickerModalProps) {
  const bounds = useMemo(
    () => resolvePickerBounds({ value: date, minimumDate, maximumDate }),
    [date, minimumDate, maximumDate],
  );

  return (
    <DateTimePickerModal
      {...rest}
      date={bounds.value}
      minimumDate={bounds.minimumDate}
      maximumDate={bounds.maximumDate}
      display={Platform.OS === "ios" ? "spinner" : "default"}
      confirmTextIOS={confirmTextIOS}
      cancelTextIOS="Cancel"
      buttonTextColorIOS={Colors.orange}
      {...MODAL_DATETIME_PICKER_PROPS}
    />
  );
}
