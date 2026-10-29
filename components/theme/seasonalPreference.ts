import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateTheme } from "@/theme/colors";

export const SEASONAL_THEME_STORAGE_KEY = "crittr:seasonal-themes:v1";
let writes: Promise<void> = Promise.resolve();
let latestWrite = 0;

export async function loadSeasonalPreference(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(SEASONAL_THEME_STORAGE_KEY)) !== "false"; }
  catch { return true; }
}

/** Serialize rapid toggles so the final choice also wins after restarting the app. */
export async function setSeasonalThemesEnabled(enabled: boolean): Promise<void> {
  const write = ++latestWrite;
  updateTheme({ enabled, preview: null });
  const pending = writes.catch(() => undefined).then(() => AsyncStorage.setItem(SEASONAL_THEME_STORAGE_KEY, String(enabled)));
  writes = pending;
  try { await pending; }
  catch (error) {
    if (write === latestWrite) updateTheme({ enabled: await loadSeasonalPreference() });
    throw error;
  }
}
