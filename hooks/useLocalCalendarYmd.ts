import { getLocalYmd, msUntilNextLocalMidnight } from "@/lib/localCalendarDate";
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

/**
 * Current local calendar day (YYYY-MM-DD). Updates when the device clock crosses
 * local midnight, on resume from background, and on a coarse interval — so "today"
 * queries refetch without relying on staleTime alone.
 */
export function useLocalCalendarYmd(): string {
  const [ymd, setYmd] = useState(() => getLocalYmd());

  useEffect(() => {
    const sync = () => {
      const next = getLocalYmd();
      setYmd((prev) => (prev === next ? prev : next));
    };

    const tick = setInterval(sync, 60_000);

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
      if (state === "active") sync();
    });

    return () => {
      clearInterval(tick);
      if (timeoutId) clearTimeout(timeoutId);
      sub.remove();
    };
  }, []);

  return ymd;
}
