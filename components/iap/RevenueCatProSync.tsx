import { syncCrittrProForSession } from "@/lib/iap/entitlementSync";
import { useAuthStore } from "@/stores/authStore";
import Purchases from "react-native-purchases";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/** Debounce: listener can fire in a burst after StoreKit / restore updates. */
const MIN_SYNC_INTERVAL_MS = 4_000;

/**
 * Keeps `profiles.crittr_pro_until` aligned when RevenueCat receives new
 * CustomerInfo from Apple (renewal, cancellation, restore, family sharing, etc.).
 * Without this, the app can show Free while Apple + RC already show active Pro.
 */
export default function RevenueCatProSync() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const refreshProfileOnly = useAuthStore((s) => s.refreshProfileOnly);
  const lastSyncAt = useRef(0);

  useEffect(() => {
    if (!userId) return;

    const pushToSupabase = async () => {
      const now = Date.now();
      if (now - lastSyncAt.current < MIN_SYNC_INTERVAL_MS) return;
      lastSyncAt.current = now;
      try {
        const r = await syncCrittrProForSession(userId);
        if (r === "synced") await refreshProfileOnly();
      } catch {
        /* syncCrittrProForSession / invoke errors are non-fatal */
      }
    };

    const onCustomerInfoUpdated = () => {
      void pushToSupabase();
    };

    Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdated);

    let appState = AppState.currentState;
    const onAppState = (next: AppStateStatus) => {
      if (appState.match(/inactive|background/) && next === "active") {
        void pushToSupabase();
      }
      appState = next;
    };
    const appSub = AppState.addEventListener("change", onAppState);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdated);
      appSub.remove();
    };
  }, [userId, refreshProfileOnly]);

  return null;
}
