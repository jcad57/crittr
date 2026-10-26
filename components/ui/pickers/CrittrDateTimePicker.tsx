import { IOS_LIGHT_PICKER_PROPS } from "@/theme/dateTimePicker";
import { resolvePickerBounds } from "@/utils/dateTimePickerBounds";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useMemo } from "react";
import type { ColorValue, StyleProp, ViewStyle } from "react-native";

export type { DateTimePickerEvent };

/**
 * Deliberately explicit rather than derived from the library's prop union: this
 * is the only file in the app allowed to render the native picker, so its
 * surface is small and audited on purpose.
 */
export type CrittrDateTimePickerProps = {
  value: Date;
  mode: "date" | "time" | "datetime";
  display: "default" | "spinner" | "compact" | "inline";
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  is24Hour?: boolean;
  minimumDate?: Date | null;
  maximumDate?: Date | null;
  textColor?: string;
  themeVariant?: "light" | "dark";
  style?: StyleProp<ViewStyle>;
  /** Android dialog buttons. */
  positiveButton?: { label?: string; textColor?: ColorValue };
  negativeButton?: { label?: string; textColor?: ColorValue };
};

/**
 * The native picker with guaranteed bounds and readable wheels.
 *
 * Both bounds are always sent, even when the caller has no constraint, because
 * omitting one lets the iOS picker fall back to the Unix epoch and lock the
 * wheel to a single instant — see `utils/dateTimePickerBounds.ts`. The light
 * theme is a default for the same reason: our sheets are always cream/white, so
 * it must not depend on each call site remembering to ask. Android ignores both
 * appearance props.
 */
export default function CrittrDateTimePicker({
  value,
  minimumDate,
  maximumDate,
  ...rest
}: CrittrDateTimePickerProps) {
  const bounds = useMemo(
    () => resolvePickerBounds({ value, minimumDate, maximumDate }),
    [value, minimumDate, maximumDate],
  );

  return (
    <DateTimePicker
      {...IOS_LIGHT_PICKER_PROPS}
      {...rest}
      value={bounds.value}
      minimumDate={bounds.minimumDate}
      maximumDate={bounds.maximumDate}
    />
  );
}
