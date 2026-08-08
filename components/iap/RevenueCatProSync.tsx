import {
  syncCrittrProFromCustomerInfo,
  syncCrittrProOnAppLaunch,
} from "@/lib/iap/entitlementSync";
import { useAuthStore } from "@/stores/authStore";
import Purchases from "react-native-purchases";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

/** Debounce: listener can fire in a burst after StoreKit / restore updates. */
const MIN_SYNC_INTERVAL_MS = 4_000;

/**
 * Keeps `profiles.crittr_pro_until` aligned when RevenueCat receives new
 * CustomerInfo from Apple (renewal, cancellation, restore, family sharing,
 * promo-code redemption, etc.). Without this, the app can show Free while
 * Apple + RC already show active Pro.
 *
 * Sync path overview:
 *   - `addCustomerInfoUpdateListener` → short-poll sync (RC just told us
 *     CustomerInfo changed; no need for a 90s patience window).
 *   - `AppState background → active` → long-poll sync (we may have missed a
 *     promo redemption / renewal while backgrounded). Always re-pull receipts.
 */
export default function RevenueCatProSync() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const refreshProfileOnly = useAuthStore((s) => s.refreshProfileOnly);
  const lastSyncAt = useRef(0);

  useEffect(() => {
    if (!userId) return;

    /**
     * Cold-start sync. Neither the CustomerInfo listener nor the AppState
     * `background → active` transition fires on app launch, so a user who
     * redeemed a promo code yesterday and just opened the app today would
     * otherwise wait until something else triggers a sync. We do this with
     * the long-poll budget so RC has enough time to surface the receipt
     * the Edge Function will fetch.
     */
    let coldStartCancelled = false;
    lastSyncAt.current = Date.now();
    void (async () => {
      try {
        const r = await syncCrittrProOnAppLaunch(userId);
        if (coldStartCancelled) return;
        if (r === "synced") await refreshProfileOnly();
      } catch {
        /* non-fatal */
      }
    })();

    const onCustomerInfoUpdated = () => {
      const now = Date.now();
      if (now - lastSyncAt.current < MIN_SYNC_INTERVAL_MS) return;
      lastSyncAt.current = now;
      void (async () => {
        try {
          const r = await syncCrittrProFromCustomerInfo(userId);
          if (r === "synced") await refreshProfileOnly();
        } catch {
          /* non-fatal: next event / focus pass retries */
        }
      })();
    };

    Purchases.addCustomerInfoUpdateListener(onCustomerInfoUpdated);

    let appState = AppState.currentState;
    const onAppState = (next: AppStateStatus) => {
      if (appState.match(/inactive|background/) && next === "active") {
        const now = Date.now();
        if (now - lastSyncAt.current >= MIN_SYNC_INTERVAL_MS) {
          lastSyncAt.current = now;
          void (async () => {
            try {
              const r = await syncCrittrProOnAppLaunch(userId);
              if (r === "synced") await refreshProfileOnly();
            } catch {
              /* non-fatal */
            }
          })();
        }
      }
      appState = next;
    };
    const appSub = AppState.addEventListener("change", onAppState);

    return () => {
      coldStartCancelled = true;
      Purchases.removeCustomerInfoUpdateListener(onCustomerInfoUpdated);
      appSub.remove();
    };
  }, [userId, refreshProfileOnly]);

  return null;
}
