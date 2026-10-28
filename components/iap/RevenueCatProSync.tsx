import {
  syncCrittrProFromCustomerInfo,
  syncCrittrProOnAppLaunch,
} from "@/lib/iap/entitlementSync";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query/client";
import { subscriptionDetailsQueryKey } from "@/lib/query/keys";
import { entitlementFromCustomerInfo } from "@/lib/iap/crittrProRevenueCat";
import { useAuthStore } from "@/stores/authStore";
import Purchases, { type CustomerInfo } from "react-native-purchases";
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
      lastSync = 0,
      pendingUpdate = false,
      failures = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let lastCustomerState: string | undefined;
    const current = () =>
      !disposed &&
      generation === sessionGeneration() &&
      useAuthStore.getState().session?.user.id === userId;
    const refresh = async () => {
      if (!current()) return;
      await useAuthStore.getState().refreshProfileOnly();
      if (current())
        await queryClient.invalidateQueries({
          queryKey: subscriptionDetailsQueryKey(userId),
        });
    };
    const sync = async (customerUpdate = false) => {
      if (!current()) return;
      if (busy || Date.now() - lastSync < 5000) {
        pendingUpdate = true;
        if (!retry)
          retry = setTimeout(() => {
            retry = undefined;
            if (AppState.currentState === "active")
              void sync(true).catch(() => {});
          }, 5000);
        return;
      }
      pendingUpdate = false;
      busy = true;
      lastSync = Date.now();
      try {
        const result = await (customerUpdate
          ? syncCrittrProFromCustomerInfo(userId)
          : syncCrittrProOnAppLaunch(userId));
        failures = result === "failed" ? failures + 1 : 0;
        // Another device/webhook may have committed even if this request was
        // throttled or lost its response. Always reread the verified profile.
        await refresh();
      } finally {
        busy = false;
        if (
          current() &&
          !retry &&
          (pendingUpdate || (failures > 0 && failures <= 3))
        )
          retry = setTimeout(
            () => {
              retry = undefined;
              if (AppState.currentState === "active")
                void sync(true).catch(() => {});
            },
            Math.max(5000, failures * 5000),
          );
      }
    };
    const changed = (info: CustomerInfo) => {
      const entitlement = entitlementFromCustomerInfo(info);
      const state = JSON.stringify([
        entitlement.isActive,
        entitlement.expiresAt,
        entitlement.productIdentifier,
        entitlement.willRenew,
        entitlement.store,
        entitlement.ownershipType,
        entitlement.latestPurchaseDate,
      ]);
      // A profile refresh can cause a fresh CustomerInfo request. Reconcile
      // only meaningful billing changes, avoiding a REST/Realtime feedback loop.
      if (state === lastCustomerState) return;
      lastCustomerState = state;
      void sync(true).catch(() => {});
    };
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync().catch(() => {});
    });
    Purchases.addCustomerInfoUpdateListener(changed);
    // RevenueCat listeners are not server push. Receive a dashboard grant or
    // revocation through the same RLS-protected profile used by feature gates.
    const channel = supabase
      .channel(`billing-profile:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => {
          void refresh().catch(() => {});
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh().catch(() => {});
      });
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
      if (retry) clearTimeout(retry);
      app.remove();
      Purchases.removeCustomerInfoUpdateListener(changed);
      void supabase.removeChannel(channel);
    };
  }, [userId]);
  return null;
}
