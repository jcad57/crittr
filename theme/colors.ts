import { useSyncExternalStore } from "react";
import { DEFAULT_COLORS, SEASONAL_THEMES, type Season, type ThemeColors } from "./seasonalThemes";

export type { ThemeColors } from "./seasonalThemes";
/** Default colors for pure data builders; rendered UI uses useThemeColors. */
export const Colors: ThemeColors = DEFAULT_COLORS;

type ThemeSnapshot = {
  enabled: boolean;
  hydrated: boolean;
  season: Season;
  preview: Season | null;
  colors: ThemeColors;
};

let snapshot: ThemeSnapshot = {
  enabled: true, hydrated: false, season: "summer", preview: null, colors: DEFAULT_COLORS,
};
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getThemeSnapshot = () => snapshot;
export const getThemeColors = () => snapshot.colors;

/** Presentation state only. Does not remount navigation or touch application data. */
export function updateTheme(patch: Partial<Omit<ThemeSnapshot, "colors">>) {
  const next = { ...snapshot, ...patch };
  next.colors = SEASONAL_THEMES[next.preview ?? (next.enabled ? next.season : "summer")].colors;
  if (Object.keys(next).every((key) => next[key as keyof ThemeSnapshot] === snapshot[key as keyof ThemeSnapshot])) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function useSeasonalTheme() {
  return useSyncExternalStore(subscribe, getThemeSnapshot, getThemeSnapshot);
}

export function useThemeColors() {
  return useSyncExternalStore(subscribe, getThemeColors, () => DEFAULT_COLORS);
}

/** Build each stylesheet/value once per palette, shared by all component instances. */
export function createThemeValues<T>(factory: (colors: ThemeColors) => T): (colors: ThemeColors) => T {
  const cache = new WeakMap<ThemeColors, T>();
  return (colors) => {
    if (!cache.has(colors)) cache.set(colors, factory(colors));
    return cache.get(colors)!;
  };
}

export function useThemeValues<T>(factory: (colors: ThemeColors) => T): T {
  return factory(useThemeColors());
}
