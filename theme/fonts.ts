// Font face map for useFonts() — keys must exactly match the PostScript name
// used in fontFamily style props throughout the app.

export const FONT_FACES = {
  // Standard
  "InstrumentSans-Regular": require("@/assets/fonts/instrument-sans/InstrumentSans-Regular.ttf"),
  "InstrumentSans-Medium": require("@/assets/fonts/instrument-sans/InstrumentSans-Medium.ttf"),
  "InstrumentSans-SemiBold": require("@/assets/fonts/instrument-sans/InstrumentSans-SemiBold.ttf"),
  "InstrumentSans-Bold": require("@/assets/fonts/instrument-sans/InstrumentSans-Bold.ttf"),
  // Condensed
  // SemiCondensed
} as const;
