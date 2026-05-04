import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_OPEN_LAST_SHOWN_STORAGE_KEY = "crittr_ad_app_open_last_shown_ms";

export async function markAppOpenLastShownNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      APP_OPEN_LAST_SHOWN_STORAGE_KEY,
      String(Date.now()),
    );
  } catch {
    // ignore
  }
}
