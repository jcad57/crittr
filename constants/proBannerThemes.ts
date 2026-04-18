import { expandGradientThirds } from "@/utils/smoothGradient";

/** Shared diagonal for inner fill + small crown badge. */
export const PRO_GRADIENT_START = { x: 0.1, y: 0 } as const;
export const PRO_GRADIENT_END = { x: 0.9, y: 1 } as const;

/** 7-stop rhythm for Pro hero inner fill (matches legacy slate). */
export const PRO_BANNER_INNER_LOCATIONS = [
  0, 0.15, 0.35, 0.52, 0.68, 0.86, 1,
] as const;

/** Legacy export name — same as `PRO_BANNER_INNER_LOCATIONS`. */
export const PRO_GRADIENT_LOCATIONS = PRO_BANNER_INNER_LOCATIONS;

export const PRO_BANNER_SHINE_BORDER_LOCATIONS = [
  0, 0.1, 0.22, 0.38, 0.48, 0.52, 0.56, 0.68, 0.8, 0.9, 1,
] as const;

export type ProBannerThemeId = "slate" | "gold" | "purple";

export type ProBannerThemeVisual = {
  id: ProBannerThemeId;
  label: string;
  subtitle: string;
  innerGradient: ReturnType<typeof expandGradientThirds>;
  shineBorderColors: readonly string[];
  cardShadowColor: string;
  crownIconColor: string;
  memberPillBackground: string;
  memberPillBorder: string;
  memberPillText: string;
  crownBadgeBorder: string;
  crownBadgeShadowColor: string;
};

const SLATE_INNER_FILL = [
  "#151b22",
  "#1c2633",
  "#2a3544",
  "#d4dce6",
  "#2a3544",
  "#1c2633",
  "#0f1419",
] as const;

const SLATE_SHINE_BORDER = [
  "#06080c",
  "#141b26",
  "#2d3d52",
  "#64748b",
  "#f1f5f9",
  "#cbd5e1",
  "#f1f5f9",
  "#64748b",
  "#2d3d52",
  "#141b26",
  "#06080c",
] as const;

const GOLD_INNER_FILL = [
  "#161008",
  "#241a12",
  "#3a2d1a",
  "#fde9c4",
  "#3a2d1a",
  "#241a12",
  "#0f0b08",
] as const;

const GOLD_SHINE_BORDER = [
  "#080604",
  "#120d08",
  "#2a2014",
  "#5c4420",
  "#c9a227",
  "#fff4d4",
  "#f0d078",
  "#b8943a",
  "#5c4018",
  "#1f1810",
  "#080604",
] as const;

const PURPLE_INNER_FILL = [
  "#100818",
  "#1a1028",
  "#2d1a45",
  "#ede4ff",
  "#2d1a45",
  "#1a1028",
  "#08050e",
] as const;

const PURPLE_SHINE_BORDER = [
  "#050308",
  "#140a22",
  "#2d1858",
  "#5b3d9e",
  "#ddd6fe",
  "#f5f0ff",
  "#c4b5fd",
  "#7c6dd4",
  "#452d7a",
  "#1a0f35",
  "#050308",
] as const;

function makeTheme(
  id: ProBannerThemeId,
  label: string,
  subtitle: string,
  innerFill: readonly string[],
  shineBorder: readonly string[],
  ui: {
    cardShadowColor: string;
    crownIconColor: string;
    memberPillBackground: string;
    memberPillBorder: string;
    memberPillText: string;
    crownBadgeBorder: string;
    crownBadgeShadowColor: string;
  },
): ProBannerThemeVisual {
  return {
    id,
    label,
    subtitle,
    innerGradient: expandGradientThirds(innerFill, PRO_BANNER_INNER_LOCATIONS),
    shineBorderColors: shineBorder,
    ...ui,
  };
}

const THEMES: Record<ProBannerThemeId, ProBannerThemeVisual> = {
  slate: makeTheme(
    "slate",
    "Slate",
    "Cool charcoal with a silver specular band",
    SLATE_INNER_FILL,
    SLATE_SHINE_BORDER,
    {
      cardShadowColor: "#1e293b",
      crownIconColor: "#e2e8f0",
      memberPillBackground: "rgba(15, 23, 42, 0.45)",
      memberPillBorder: "rgba(241, 245, 249, 0.35)",
      memberPillText: "#f8fafc",
      crownBadgeBorder: "rgba(255, 255, 255, 0.55)",
      crownBadgeShadowColor: "#334155",
    },
  ),
  gold: makeTheme(
    "gold",
    "Gold",
    "Warm bronze with champagne highlights",
    GOLD_INNER_FILL,
    GOLD_SHINE_BORDER,
    {
      cardShadowColor: "#422006",
      crownIconColor: "#fef3c7",
      memberPillBackground: "rgba(55, 38, 18, 0.5)",
      memberPillBorder: "rgba(253, 230, 138, 0.45)",
      memberPillText: "#fffbeb",
      crownBadgeBorder: "rgba(254, 243, 199, 0.65)",
      crownBadgeShadowColor: "#92400e",
    },
  ),
  purple: makeTheme(
    "purple",
    "Royal purple",
    "Deep violet with soft lilac shine",
    PURPLE_INNER_FILL,
    PURPLE_SHINE_BORDER,
    {
      cardShadowColor: "#2e1065",
      crownIconColor: "#f3e8ff",
      memberPillBackground: "rgba(46, 16, 101, 0.45)",
      memberPillBorder: "rgba(216, 180, 254, 0.45)",
      memberPillText: "#faf5ff",
      crownBadgeBorder: "rgba(233, 213, 255, 0.6)",
      crownBadgeShadowColor: "#6b21a8",
    },
  ),
};

export const PRO_BANNER_THEME_ORDER: ProBannerThemeId[] = [
  "gold",
  "purple",
  "slate",
];

export function resolveProBannerTheme(id: ProBannerThemeId): ProBannerThemeVisual {
  return THEMES[id];
}

export function normalizeProBannerThemeId(
  raw: string | null | undefined,
): ProBannerThemeId {
  if (raw === "gold" || raw === "purple" || raw === "slate") return raw;
  return "slate";
}

/** @deprecated Import from `proBannerThemes` — slate inner anchor stops. */
export const PRO_HERO_INNER_FILL_COLORS = SLATE_INNER_FILL;

const slateTheme = THEMES.slate;

/** @deprecated Prefer `resolveProBannerTheme('slate').innerGradient`. */
export const PRO_HERO_INNER_GRADIENT = slateTheme.innerGradient;

/** @deprecated Prefer `resolveProBannerTheme('slate').shineBorderColors`. */
export const PRO_HERO_SHINE_BORDER_COLORS = slateTheme.shineBorderColors;

/** @deprecated Use `PRO_BANNER_SHINE_BORDER_LOCATIONS`. */
export const PRO_HERO_SHINE_BORDER_LOCATIONS = PRO_BANNER_SHINE_BORDER_LOCATIONS;
