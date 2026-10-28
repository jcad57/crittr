/** Font family names from useFonts() — must match @expo-google-fonts keys. */

/** Tab roots: Dashboard greeting, Schedule, My pets, Health, Crittr AI. */
export const MAIN_SCREEN_TITLE_SIZE = 28;

/** Stack flows: edit/add pet, activities, vet visits, medications, food, etc. */
export const MANAGE_SCREEN_TITLE_SIZE = 20;

export const Font = {
  // Display — the website uses Fredoka at medium / semibold weights
  displaySemiBold: "Fredoka-Medium",
  displayBold: "Fredoka-SemiBold",
  // UI body — Nunito, matching the website
  uiRegular: "Nunito-Regular",
  uiMedium: "Nunito-Medium",
  uiSemiBold: "Nunito-SemiBold",
  uiBold: "Nunito-Bold",
  // Compatibility keys for onboarding, activity steps, navigation and cards
  isRegular: "Nunito-Regular",
  isMedium: "Nunito-Medium",
  isSemiBold: "Nunito-SemiBold",
  isBold: "Nunito-Bold",
} as const;
