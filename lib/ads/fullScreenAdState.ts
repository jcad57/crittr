import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SHOWN_STORAGE_KEY = "crittr_ad_full_screen_last_shown_ms";
const RECENT_AD_MS = 45_000;
let active = false;
let lastShownAt: number | null = null;

export function setFullScreenAdActive(value: boolean): void {
  active = value;
}

export async function markFullScreenAdShownNow(): Promise<void> {
  lastShownAt = Date.now();
  try {
    await AsyncStorage.setItem(LAST_SHOWN_STORAGE_KEY, String(lastShownAt));
  } catch {
    // Advertising must not depend on local persistence.
  }
}

/** Keep rating and milestone sheets from interrupting a full-screen ad. */
export async function wasFullScreenAdShownRecently(): Promise<boolean> {
  if (active || (lastShownAt != null && Date.now() - lastShownAt < RECENT_AD_MS)) return true;
  try {
    const raw = await AsyncStorage.getItem(LAST_SHOWN_STORAGE_KEY);
    const timestamp = raw ? Number(raw) : NaN;
    return active || (Number.isFinite(timestamp) && Date.now() - timestamp < RECENT_AD_MS);
  } catch {
    return active;
  }
}
