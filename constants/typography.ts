/** Font family names from useFonts() — must match @expo-google-fonts keys. */

/** Tab roots: Dashboard greeting, Activity, My pets, Health, Crittr AI. */
export const MAIN_SCREEN_TITLE_SIZE = 28;

/** Stack flows: edit/add pet, activities, vet visits, medications, food, etc. */
export const MANAGE_SCREEN_TITLE_SIZE = 20;

export const Font = {
  // Display (Fraunces)
  displaySemiBold: "Fraunces_600SemiBold",
  displayBold: "Fraunces_700Bold",
  // UI body (DM Sans) — used by main logged-in screens
  uiRegular: "DMSans_400Regular",
  uiMedium: "DMSans_500Medium",
  uiSemiBold: "DMSans_600SemiBold",
  uiBold: "DMSans_700Bold",
  // Instrument Sans — used by onboarding, activity steps, nav, and card components
  isRegular: "InstrumentSans-Regular",
  isMedium: "InstrumentSans-Medium",
  isSemiBold: "InstrumentSans-SemiBold",
  isBold: "InstrumentSans-Bold",
} as const;
