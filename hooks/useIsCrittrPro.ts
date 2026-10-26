import { isCrittrProFromProfile, proAccessDeadline } from "@/lib/crittrPro";
import type { Profile } from "@/types/database";
import { useEffect, useReducer } from "react";
import { AppState } from "react-native";
/** One authority for labels and gated actions, including expiry while the app stays open. */
export function useIsCrittrPro(profile: Profile | null | undefined): boolean {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const deadline = proAccessDeadline(profile);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const remaining = deadline - Date.now();
      if (remaining > 0)
        timer = setTimeout(
          () => {
            tick();
            schedule();
          },
          Math.min(remaining + 10, 2147483647),
        );
    };
    schedule();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      if (timer) clearTimeout(timer);
      listener.remove();
    };
  }, [deadline]);
  return isCrittrProFromProfile(profile);
}
