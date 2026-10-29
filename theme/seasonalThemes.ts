/**
 * The only color configuration file for seasonal themes.
 * Edit DEFAULT_COLORS for summer / themes off, or a seasonal override below.
 * Unspecified tokens retain their default value, including safety/status colors,
 * literal white/black, and remembrance colors. Existing icons and assets are unchanged.
 */
export type Season = "spring" | "summer" | "fall" | "winter";

export const DEFAULT_COLORS = {
  // Brand
  orange: "#FD8A2D",
  orangeLight: "#FFF0E5",
  orangeDark: "#c2540a",

  // Dashboard ring inks (kept separate to preserve the default design).
  dashboardExercise: "#536F8B",
  dashboardMeals: "#8A5F7A",
  dashboardTreats: "#68754B",
  dashboardMeds: "#A7633D",
  dashboardMaintenance: "#637568",
  dashboardTrack: "#FFF4EB",

  /** Pet hero quick-glance pills when the fact is true (dark teal-forest on orange) */
  petHeroTagActive: "#124E46",

  /**
   * Matches native splash (`expo-splash-screen` + `expo.backgroundColor`) so the handoff
   * from launch → JS doesn’t flash white before screens paint.
   */
  splashBackground: "#fff7f1",

  /** Dashboard / marketing cream (replaces full-screen orange gradient) */
  cream: "#FAF7F1",
  screenBackground: "#FAF7F1",
  creamDark: "#E4DED2",

  // Website surfaces
  warmWhite: "#FFFDF8",
  sage: "#E6ECD7",
  sageDark: "#536B43",
  peach: "#FFE5D5",
  peachDark: "#9E542C",

  // Neutrals
  white: "#ffffff",
  black: "#000000",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#101719",

  // Semantic
  background: "#ffffff",
  surface: "#f9fafb",
  textPrimary: "#101719",
  textSecondary: "#6b7280",
  border: "#e5e7eb",

  // Status
  success: "#22c55e",
  successLight: "#E6ECD7",
  error: "#ef4444",
  errorLight: "#fee2e2",

  // Accent palette (progress rings, activity, categories)
  coral: "#FF9D9D",
  coralLight: "#FFE8E8",
  amber: "#FFA94D",
  amberLight: "#FFF0DD",
  gold: "#FFD43B",
  goldLight: "#FFF8DD",
  lavender: "#D5C1DD",
  lavenderLight: "#ECE1F5",
  mint: "#34D399",
  mintLight: "#D1FAE5",
  sky: "#C0E3E5",
  skyLight: "#E3F0EF",

  /**
   * Daily progress rings — soft “light” tints aligned to lavender / sky / amber / success
   * (see lavenderDark, skyDark, amberDark, successDark). Rings read clearly on cream;
   * tracks are whisper-light washes of the same families.
   */
  progressExercise: "#467C7F",
  progressExerciseTrack: "#E8F6F6",
  progressTraining: "#8F4A6F",
  progressTrainingTrack: "#F6E8F2",
  progressMeals: "#846698",
  progressMealsTrack: "#ECE1F5",
  progressTreats: "#53714B",
  progressTreatsTrack: "#E6ECD7",
  progressMeds: "#A77A36",
  progressMedsTrack: "#FFF0D5",

  /** Each finished goal uses a dark green; the lighter card marks all goals met. */
  progressCompleteRing: "#3F6C42",
  progressCompleteTrack: "#D6E4CD",
  progressCompleteBackground: "#E6ECD7",
  progressCompleteBorder: "#AAC49D",

  /** Dark “feature” cards (e.g. upcoming visit hero) */
  featureDark: "#2A2624",
  featureDarkElevated: "#3D3835",

  /** User profile hero (matches reference / visit card tone) */
  profileHeroDark: "#1a1208",

  /** Sign out — text & icon tint */
  signOutCoral: "#C73E2D",
  signOutCoralIconBg: "#FFEAE8",

  sectionLabel: "#A18B7A",

  /** Darker tints for icons on light accent backgrounds (e.g. pet attribute chips) */
  lavenderDark: "#5D4A6B",
  skyDark: "#256A6E",
  amberDark: "#B45309",
  successDark: "#15803D",

  /** Memorial / remembrance cards — calm dusk, soft harmony */
  memorialLavender: "#7A6F8E",
  memorialLavenderDeep: "#5C5468",
  memorialMist: "#A39BB5",
  memorialGoldSoft: "#C9B896",
  memorialTextMuted: "rgba(255,255,255,0.78)",
} as const;


export type ThemeColors = { readonly [K in keyof typeof DEFAULT_COLORS]: string };

type SeasonalTheme = {
  colors: ThemeColors;
  particles: null | {
    kind: "leaves" | "snow";
    colors: readonly string[];
  };
};

const spring: ThemeColors = {
  ...DEFAULT_COLORS,
  orange: "#627A54", orangeLight: "#E4ECD9", orangeDark: "#4E6743",
  splashBackground: "#FFF0EA", cream: "#FFF0EA", screenBackground: "#FFF0EA", creamDark: "#E4CCC4",
  warmWhite: "#FFFAF5", background: "#FFFAF5", surface: "#F7EAE5",
  sage: "#DCE7CE", sageDark: "#4E6743", peach: "#F8D0C3", peachDark: "#8F4E45",
  textPrimary: "#343B32", textSecondary: "#6D6863", sectionLabel: "#826F68",
  gray50: "#FCF5F1", gray100: "#F4EAE4", gray200: "#E5D8D0", gray300: "#CCBDB5",
  gray400: "#93867F", gray500: "#756960",
  coral: "#DFA39C", coralLight: "#FBE2DC", amber: "#DDB98B", amberLight: "#F8EBDD",
  gold: "#DBCA8A", goldLight: "#FAF2D9", lavender: "#B9A4C4", lavenderLight: "#EEE4F2", lavenderDark: "#6D567B",
  mint: "#91AF8C", mintLight: "#E2EDDD", sky: "#C7DED8", skyLight: "#E8F2EE", skyDark: "#4F7266",
  amberDark: "#8C623C", featureDark: "#344B3C", featureDarkElevated: "#49604E", profileHeroDark: "#2E4034",
  progressExercise: "#5E7B57", progressExerciseTrack: "#E2EDDA",
  progressTraining: "#8E6D96", progressTrainingTrack: "#F0E5F2",
  progressMeals: "#9C6373", progressMealsTrack: "#FAE1E5",
  progressTreats: "#67754F", progressTreatsTrack: "#E7ECD9",
  progressMeds: "#91704B", progressMedsTrack: "#F4E8D8",
  dashboardExercise: "#5E7B57", dashboardMeals: "#8F637D", dashboardTreats: "#68754B",
  dashboardMeds: "#946545", dashboardMaintenance: "#527966", dashboardTrack: "#FFF7F0",
  progressCompleteRing: "#3C6541", progressCompleteTrack: "#D2E3CA",
  progressCompleteBackground: "#E2ECD8", progressCompleteBorder: "#ADC69F",
};

const fall: ThemeColors = {
  ...DEFAULT_COLORS,
  orange: "#B95520", orangeLight: "#FBE2C7", orangeDark: "#994016",
  splashBackground: "#FFF0DC", cream: "#FFF0DC", screenBackground: "transparent", creamDark: "#E7C7A7",
  warmWhite: "#FFF9ED", background: "#FFF9ED", surface: "#FBEAD6",
  sage: "#E6DFBC", sageDark: "#6E6839", peach: "#F8D2AA", peachDark: "#9B4726",
  textPrimary: "#452E26", textSecondary: "#806454", sectionLabel: "#94694F",
  gray50: "#FFF6E9", gray100: "#F8EAD9", gray200: "#E8D5BE", gray300: "#D3BCA3",
  gray400: "#A1846C", gray500: "#806454",
  coral: "#CB8070", coralLight: "#F8DDD2", amber: "#E6A24F", amberLight: "#FBE5C5",
  gold: "#D5B457", goldLight: "#F7EDCC", lavender: "#BE9292", lavenderLight: "#F0DCDD", lavenderDark: "#823F49",
  mint: "#9CA16C", mintLight: "#E8E8D1", sky: "#D5D8B5", skyLight: "#EDEDD9", skyDark: "#636A3E",
  amberDark: "#9B5C1F", featureDark: "#64382D", featureDarkElevated: "#7D4B39", profileHeroDark: "#4D2D26",
  progressExercise: "#A15A2B", progressExerciseTrack: "#F9E2C8",
  progressTraining: "#8F444D", progressTrainingTrack: "#F2DADC",
  progressMeals: "#9D4946", progressMealsTrack: "#F4DCD4",
  progressTreats: "#77743F", progressTreatsTrack: "#EDE8CB",
  progressMeds: "#98681F", progressMedsTrack: "#F9EAC3",
  dashboardExercise: "#A15A2B", dashboardMeals: "#91434D", dashboardTreats: "#73713E",
  dashboardMeds: "#98681F", dashboardMaintenance: "#73734B", dashboardTrack: "#FFF5E5",
  progressCompleteRing: "#52643A", progressCompleteTrack: "#DBE0C0",
  progressCompleteBackground: "#E9E9D2", progressCompleteBorder: "#BDC697",
};

const winter: ThemeColors = {
  ...DEFAULT_COLORS,
  orange: "#3D769F", orangeLight: "#DCEEF9", orangeDark: "#2E648D",
  splashBackground: "#EAF5FC", cream: "#EAF5FC", screenBackground: "transparent", creamDark: "#BDD5E7",
  warmWhite: "#F8FCFF", background: "#F8FCFF", surface: "#E2F0F8",
  sage: "#DBEBE9", sageDark: "#496F6B", peach: "#CFE5F6", peachDark: "#35658A",
  textPrimary: "#263F5A", textSecondary: "#5D758A", sectionLabel: "#63819B",
  gray50: "#F2F8FC", gray100: "#EAF2F8", gray200: "#CBDDEB", gray300: "#ADC6DB",
  gray400: "#7D9AB0", gray500: "#5D758A",
  coral: "#C4ADCE", coralLight: "#F0E8F4", amber: "#ADCEE5", amberLight: "#E0EFFA",
  gold: "#C4DBEA", goldLight: "#EAF5FC", lavender: "#C0C6E3", lavenderLight: "#E8ECF8", lavenderDark: "#5E6C98",
  mint: "#93C5C1", mintLight: "#DFF0ED", sky: "#B8DCEE", skyLight: "#E0F1FA", skyDark: "#386F92",
  amberDark: "#416F98", featureDark: "#294A6D", featureDarkElevated: "#3E6385", profileHeroDark: "#203C5C",
  progressExercise: "#407B9B", progressExerciseTrack: "#DCEFF8",
  progressTraining: "#72749F", progressTrainingTrack: "#E9EAF7",
  progressMeals: "#627BA9", progressMealsTrack: "#E2EAF8",
  progressTreats: "#4C807D", progressTreatsTrack: "#DDEEEB",
  progressMeds: "#6F6F9E", progressMedsTrack: "#E9E8F5",
  dashboardExercise: "#407B9B", dashboardMeals: "#627BA9", dashboardTreats: "#4C807D",
  dashboardMeds: "#6F6F9E", dashboardMaintenance: "#527C8B", dashboardTrack: "#F5FBFF",
  progressCompleteRing: "#356A55", progressCompleteTrack: "#CDE4D7",
  progressCompleteBackground: "#DFEDE5", progressCompleteBorder: "#A3C9B4",
};

export const SEASONAL_THEMES: Readonly<Record<Season, SeasonalTheme>> = {
  spring: { colors: spring, particles: null },
  summer: { colors: DEFAULT_COLORS, particles: null },
  fall: { colors: fall, particles: { kind: "leaves", colors: ["#7A4B2A", "#E5B83D", "#D87528", "#A16B3A", "#F0CC58", "#BF5A24"] } },
  winter: { colors: winter, particles: { kind: "snow", colors: ["#FFFFFF", "#FAFAFA", "#F5F5F5", "#F0F0F0"] } },
};
