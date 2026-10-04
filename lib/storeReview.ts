import * as Linking from "expo-linking";
import * as StoreReview from "expo-store-review";
import { Platform } from "react-native";

const ANDROID_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.jcadeichmann.crittr";

let requestedThisProcess = false;

/**
 * Ask the OS to show its native in-app review UI. Apple and Google decide
 * whether it actually appears; this must never throw into product UI.
 *
 * Callers must not also present a custom rating dialog — that stacks a second
 * prompt on top of this sheet.
 */
export async function requestStoreReview(): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  if (requestedThisProcess) return;
  requestedThisProcess = true;
  try {
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return;
    }
    if (Platform.OS === "android") {
      const canOpen = await Linking.canOpenURL(ANDROID_PLAY_STORE_URL);
      if (canOpen) await Linking.openURL(ANDROID_PLAY_STORE_URL);
    }
  } catch {
    // Store review is best-effort; quota / simulator / Expo Go must not crash.
  }
}
