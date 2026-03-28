import { focusManager } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Tell React Query when the app is foregrounded so stale queries re-fetch.
 * Call once at app startup (e.g. in the root layout or SessionGate).
 */
export function setupReactQueryFocusManager() {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener(
      "change",
      (status: AppStateStatus) => {
        handleFocus(status === "active");
      },
    );
    return () => sub.remove();
  });
}
