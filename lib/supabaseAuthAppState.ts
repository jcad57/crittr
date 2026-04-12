import { supabase } from "@/lib/supabase";
import { AppState, Platform, type AppStateStatus } from "react-native";

/**
 * React Native cannot infer foreground vs background like a browser tab.
 * Without this, session refresh timers are unreliable and `getSession()` may
 * block on refresh paths — which can surface as PostgREST calls that never settle.
 *
 * @see https://supabase.com/docs/guides/auth/quickstarts/react-native
 */
export function setupSupabaseAuthAutoRefresh(): () => void {
  if (Platform.OS === "web") {
    return () => {};
  }

  const sync = (state: AppStateStatus) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  };

  sync(AppState.currentState);
  const sub = AppState.addEventListener("change", sync);

  return () => {
    sub.remove();
    void supabase.auth.stopAutoRefresh();
  };
}
