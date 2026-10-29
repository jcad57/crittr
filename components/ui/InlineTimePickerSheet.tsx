import CrittrDateTimePicker, {
  type DateTimePickerEvent,
} from "@/components/ui/pickers/CrittrDateTimePicker";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { getIosSpinnerPickerStyle } from "@/theme/dateTimePicker";
import { Font } from "@/theme/typography";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type InlineTimePickerSheetProps = {
  visible: boolean;
  value: Date;
  is24Hour: boolean;
  title: string;
  onNativeChange: (event: DateTimePickerEvent, date?: Date) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Time spinner chrome shared by add-activity, meals, medications, and exercise.
 *
 * The dimming Pressable is `flex: 1` *above* the sheet — never `absoluteFill` —
 * so it cannot cover the wheels (which greys out hours/minutes and blocks scroll).
 *
 * A time picker has no date range to enforce, so it passes no bounds and
 * `CrittrDateTimePicker` substitutes the widest ones. It must never render the
 * native picker directly — see `utils/dateTimePickerBounds.ts`.
 */
export default function InlineTimePickerSheet({
  visible,
  value,
  is24Hour,
  title,
  onNativeChange,
  onCancel,
  onConfirm,
}: InlineTimePickerSheetProps) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const iosSpinnerPickerStyle = useThemeValues(getIosSpinnerPickerStyle);
  if (!visible) return null;

  if (Platform.OS === "android") {
    return (
      <CrittrDateTimePicker
        value={value}
        mode="time"
        display="default"
        is24Hour={is24Hour}
        onChange={onNativeChange}
        positiveButton={{ label: "OK", textColor: Colors.black }}
        negativeButton={{ label: "Cancel", textColor: Colors.black }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdropFlex}
        onPress={onCancel}
        accessibilityLabel="Dismiss time picker"
      />
      <View style={styles.sheet} collapsable={false}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarSide}>
            <Pressable onPress={onCancel} hitSlop={12}>
              <Text style={styles.toolbarBtn}>Cancel</Text>
            </Pressable>
          </View>
          <Text style={styles.toolbarTitle} numberOfLines={1}>
            {title}
          </Text>
          <View style={[styles.toolbarSide, styles.toolbarSideEnd]}>
            <Pressable onPress={onConfirm} hitSlop={12}>
              <Text style={[styles.toolbarBtn, styles.done]}>Done</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.pickerWrap} collapsable={false}>
          <CrittrDateTimePicker
            value={value}
            mode="time"
            display="spinner"
            is24Hour={is24Hour}
            onChange={onNativeChange}
            style={iosSpinnerPickerStyle}
          />
        </View>
      </View>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropFlex: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerWrap: {
    width: "100%",
    height: 216,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
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
    paddingLeft: 12,
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
}));
