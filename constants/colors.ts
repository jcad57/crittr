export const Colors = {
  // Brand
  orange: "#FC8D2C",
  orangeLight: "#FFF0E5",
  orangeDark: "#c2540a",

  /** Pet hero quick-glance pills when the fact is true (dark teal-forest on orange) */
  petHeroTagActive: "#124E46",

  /** Dashboard / marketing cream (replaces full-screen orange gradient) */
  cream: "#FDF8F3",
  creamDark: "#EDE4D8",

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
  gray900: "#111827",

  // Semantic
  background: "#ffffff",
  surface: "#f9fafb",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  border: "#e5e7eb",

  // Status
  success: "#22c55e",
  successLight: "#DCFCE7",
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
  lavenderLight: "#F3EEFF",
  mint: "#34D399",
  mintLight: "#D1FAE5",
  sky: "#C0E3E5",
  skyLight: "#DBEAFE",

  /**
   * Daily progress rings — soft “light” tints aligned to lavender / sky / amber / success
   * (see lavenderDark, skyDark, amberDark, successDark). Rings read clearly on cream;
   * tracks are whisper-light washes of the same families.
   */
  progressExercise: "#4A8B8F",
  progressExerciseTrack: "#E8F6F6",
  progressMeals: "#8B7A9E",
  progressMealsTrack: "#EEE8F4",
  progressTreats: "#22A55C",
  progressTreatsTrack: "#DCFCE7",
  progressMeds: "#D97706",
  progressMedsTrack: "#FFF4E0",

  /** Daily progress — all goals met (rings share one green family on success card) */
  progressCompleteRing: "#16A34A",
  progressCompleteTrack: "#B4E8C4",

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
} as const;
