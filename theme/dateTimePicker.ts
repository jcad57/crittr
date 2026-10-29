import { createThemeValues } from "@/theme/colors";
import { StyleSheet } from "react-native";

/**
 * Shared native picker appearance for light Crittr sheets.
 * Explicit `textColor` keeps unselected spinner rows readable on recent iOS;
 * `themeVariant: "light"` matches our cream/white chrome regardless of system dark mode.
 *
 * Appearance only — date bounds belong in `utils/dateTimePickerBounds.ts`, and
 * are applied by the wrappers in `components/ui/pickers/`, which are the only
 * places allowed to render either picker library.
 */
export const getIosLightPickerProps = createThemeValues((Colors) => ({
  themeVariant: "light" as const,
  textColor: Colors.black,
}));

/** Props spread into `react-native-modal-datetime-picker` (forwarded to the community picker). */
export const getModalDatetimePickerProps = createThemeValues((Colors) => { const IOS_LIGHT_PICKER_PROPS = getIosLightPickerProps(Colors); return {
  ...IOS_LIGHT_PICKER_PROPS,
  modalPropsIOS: { presentationStyle: "overFullScreen" as const },
  pickerContainerStyleIOS: { backgroundColor: Colors.white },
}; });

/** Fixed spinner frame for time-only sheets (not datetime — those need more vertical room). */
export const getIosSpinnerPickerStyle = createThemeValues((Colors) => (StyleSheet.create({
  picker: {
    width: "100%",
    height: 216,
    backgroundColor: Colors.white,
    alignSelf: "center",
  },
}).picker));
