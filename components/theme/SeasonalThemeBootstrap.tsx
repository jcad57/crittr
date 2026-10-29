import { useEffect } from "react";
import { AppState } from "react-native";
import { updateTheme } from "@/theme/colors";
import { deviceTimeZone, hemisphereForTimeZone, nextSeasonTransition, seasonAt } from "@/utils/seasonCalendar";
import { loadSeasonalPreference } from "./seasonalPreference";

export default function SeasonalThemeBootstrap() {
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      if (disposed) return;
      const now = new Date();
      updateTheme({ season: seasonAt(now, hemisphereForTimeZone(deviceTimeZone())) });
      if (AppState.currentState !== "active") return;
      // Exact boundary timer, capped to notice clock/timezone changes while foregrounded.
      const next = nextSeasonTransition(now);
      timer = setTimeout(refresh, Math.max(1, Math.min(next ? next - now.getTime() : Infinity, 30 * 60_000)));
    };
    void loadSeasonalPreference().then((enabled) => {
      if (disposed) return;
      refresh();
      updateTheme({ enabled, hydrated: true });
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
      else clearTimeout(timer);
    });
    return () => { disposed = true; clearTimeout(timer); subscription.remove(); };
  }, []);
  return null;
}
