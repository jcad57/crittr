import { focusManager } from "@tanstack/react-query";
import {
  noteAppBackgrounded,
  peekAppForegroundedAwayMs,
  STALE_RESUME_AFTER_MS,
} from "@/lib/appLifecycle";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Tell React Query when the app is foregrounded so stale queries re-fetch.
 * Call once at app startup (e.g. in the root layout or SessionGate).
 *
 * Coordinates with `appResumeHandler`: on a stale resume (>=30s away), the
 * resume handler cancels + invalidates everything, so we skip
 * `handleFocus(true)` here to avoid starting and immediately cancelling a wave
 * of refetches.
 */
export function setupReactQueryFocusManager() {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener(
      "change",
      (status: AppStateStatus) => {
        if (status !== "active") {
          noteAppBackgrounded(Date.now());
          handleFocus(false);
          return;
        }
        const awayMs = peekAppForegroundedAwayMs();
        if (awayMs >= STALE_RESUME_AFTER_MS) return;
        handleFocus(true);
      },
    );
    return () => sub.remove();
  });
}
