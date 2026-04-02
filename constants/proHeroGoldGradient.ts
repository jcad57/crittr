import { expandGradientThirds } from "@/utils/smoothGradient";

/**
 * Pro profile hero inner fill — same geometry as `upgrade.tsx` (7 stops, diagonal).
 * `PRO_HERO_INNER_GRADIENT` adds blended stops for a softer ramp (shared with dashboard crown).
 */
export const PRO_GRADIENT_LOCATIONS = [
  0, 0.15, 0.35, 0.52, 0.68, 0.86, 1,
] as const;

export const PRO_GRADIENT_START = { x: 0.1, y: 0 } as const;
export const PRO_GRADIENT_END = { x: 0.9, y: 1 } as const;

export const PRO_HERO_GOLD_FILL_COLORS = [
  "#E8D088",
  "#E0C278",
  "#D8B868",
  "#fffac9",
  "#D8B868",
  "#E0C278",
  "#D0B060",
] as const;

export const PRO_HERO_INNER_GRADIENT = expandGradientThirds(
  PRO_HERO_GOLD_FILL_COLORS,
  PRO_GRADIENT_LOCATIONS,
);
