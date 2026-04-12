import type { PushNotificationPrefs } from "@/utils/pushNotificationPreferences";
import {
  loadPushNotificationPrefs,
  savePushNotificationPrefs,
} from "@/utils/pushNotificationPreferences";
import { useCallback, useEffect, useState } from "react";

export function usePushNotificationPreferences() {
  const [prefs, setPrefs] = useState<PushNotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await loadPushNotificationPrefs();
      if (!cancelled) {
        setPrefs(next);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePrefs = useCallback(
    async (next: PushNotificationPrefs) => {
      setPrefs(next);
      await savePushNotificationPrefs(next);
    },
    [],
  );

  return { prefs, loading, updatePrefs };
}
