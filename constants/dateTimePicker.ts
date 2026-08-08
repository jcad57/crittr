import { Colors } from "@/constants/colors";
import { StyleSheet } from "react-native";

/**
 * Shared native picker appearance for light Crittr sheets.
 * Explicit `textColor` keeps unselected spinner rows readable on recent iOS;
 * `themeVariant: "light"` matches our cream/white chrome regardless of system dark mode.
 */
export const IOS_LIGHT_PICKER_PROPS = {
  themeVariant: "light" as const,
  textColor: Colors.black,
};

/** Props spread into `react-native-modal-datetime-picker` (forwarded to the community picker). */
export const MODAL_DATETIME_PICKER_PROPS = {
  ...IOS_LIGHT_PICKER_PROPS,
};

/** Fixed spinner frame for time-only sheets (not datetime — those need more vertical room). */
export const iosSpinnerPickerStyle = StyleSheet.create({
  picker: {
    width: "100%",
    height: 216,
    backgroundColor: Colors.white,
    alignSelf: "center",
  },
}).picker;
