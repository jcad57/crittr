import { getLocalYmd, msUntilNextLocalMidnight } from "@/utils/localCalendarDate";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Current local calendar day (YYYY-MM-DD). Updates when the device clock crosses
 * local midnight, on resume from background, and on a coarse interval — so "today"
 * queries refetch without relying on staleTime alone.
 *
 * The 60s interval is paused while the app is backgrounded (no point ticking
 * when nothing renders); the AppState resume listener catches the day rollover
 * when the user comes back.
 */
export function useLocalCalendarYmd(): string {
  const [ymd, setYmd] = useState(() => getLocalYmd());

  useEffect(() => {
    const sync = () => {
      const next = getLocalYmd();
      setYmd((prev) => (prev === next ? prev : next));
    };

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const startInterval = () => {
      if (intervalId) return;
      intervalId = setInterval(sync, 60_000);
    };
    const stopInterval = () => {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = undefined;
    };
    if (AppState.currentState === "active") startInterval();

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const scheduleMidnight = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sync();
        scheduleMidnight();
      }, msUntilNextLocalMidnight());
    };
    scheduleMidnight();

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        sync();
        startInterval();
      } else {
        stopInterval();
      }
    });

    return () => {
      stopInterval();
      if (timeoutId) clearTimeout(timeoutId);
      sub.remove();
    };
  }, []);

  return ymd;
}
