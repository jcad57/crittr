/** Bundled website fonts. Names match the static faces' PostScript names. */
const nunito = {
  regular: require("@/assets/fonts/nunito/Nunito-Regular.ttf"),
  medium: require("@/assets/fonts/nunito/Nunito-Medium.ttf"),
  semibold: require("@/assets/fonts/nunito/Nunito-SemiBold.ttf"),
  bold: require("@/assets/fonts/nunito/Nunito-Bold.ttf"),
};

export const FONT_FACES = {
  "Fredoka-Medium": require("@/assets/fonts/fredoka/Fredoka-Medium.ttf"),
  "Fredoka-SemiBold": require("@/assets/fonts/fredoka/Fredoka-SemiBold.ttf"),
  "Nunito-Regular": nunito.regular,
  "Nunito-Medium": nunito.medium,
  "Nunito-SemiBold": nunito.semibold,
  "Nunito-Bold": nunito.bold,
  "Nunito-ExtraBold": require("@/assets/fonts/nunito/Nunito-ExtraBold.ttf"),
  // Older form/onboarding styles still use literal Instrument Sans names.
  "InstrumentSans-Regular": nunito.regular,
  "InstrumentSans-Medium": nunito.medium,
  "InstrumentSans-SemiBold": nunito.semibold,
  "InstrumentSans-Bold": nunito.bold,
} as const;
