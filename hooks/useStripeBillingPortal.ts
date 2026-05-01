import {
  profileQueryKey,
  subscriptionDetailsQueryKey,
} from "@/hooks/queries";
import { createBillingPortalSession } from "@/services/stripeSubscription";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

/**
 * Opens Stripe Customer Portal (payment method, billing address, invoices).
 */
export function useStripeBillingPortal() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const [opening, setOpening] = useState(false);

  const openBillingPortal = useCallback(async () => {
    setOpening(true);
    try {
      const url = await createBillingPortalSession();
      await WebBrowser.openBrowserAsync(url);
      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        });
        await queryClient.invalidateQueries({
          queryKey: subscriptionDetailsQueryKey(userId),
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Could not open billing", msg);
    } finally {
      setOpening(false);
    }
  }, [queryClient, userId]);

  return { openBillingPortal, opening };
}
