import {
  syncCrittrProFromCustomerInfo,
  syncCrittrProOnAppLaunch,
} from "@/lib/iap/entitlementSync";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { useAuthStore } from "@/stores/authStore";
import Purchases from "react-native-purchases";
import { useEffect } from "react";
import { AppState } from "react-native";

/** Background reconciliation never controls routing or grants access from device receipts. */
export default function RevenueCatProSync() {
  const userId = useAuthStore((s) =>
    s.isLoggedIn ? s.session?.user.id : undefined,
  );
  useEffect(() => {
    if (!userId) return;
    const generation = sessionGeneration();
    let disposed = false,
      busy = false,
      lastSync = 0;
    const current = () => !disposed && generation === sessionGeneration();
    const sync = async (customerUpdate = false) => {
      if (!current() || busy || Date.now() - lastSync < 4000) return;
      busy = true;
      lastSync = Date.now();
      try {
        const result = await (customerUpdate
          ? syncCrittrProFromCustomerInfo(userId)
          : syncCrittrProOnAppLaunch(userId));
        if (current() && result === "synced")
          await useAuthStore.getState().refreshProfileOnly();
      } finally {
        busy = false;
      }
    };
    const changed = () => {
      void sync(true).catch(() => {});
    };
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync().catch(() => {});
    });
    Purchases.addCustomerInfoUpdateListener(changed);
    void sync().catch(() => {});
    // Also recover missed webhooks/temporary failures while the app stays open.
    const timer = setInterval(
      () => {
        if (AppState.currentState === "active") void sync().catch(() => {});
      },
      5 * 60 * 1000,
    );
    return () => {
      disposed = true;
      clearInterval(timer);
      app.remove();
      Purchases.removeCustomerInfoUpdateListener(changed);
    };
  }, [userId]);
  return null;
}
