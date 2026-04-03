import { useStripe } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";
import { useCallback, useEffect } from "react";

/**
 * Forwards return URLs from 3DS / bank redirects back into the Stripe RN SDK.
 * Must render under StripeProvider (see SessionGate).
 */
export default function StripeUrlHandler() {
  const { handleURLCallback } = useStripe();

  const onUrl = useCallback(
    async (url: string | null) => {
      if (!url) return;
      await handleURLCallback(url);
    },
    [handleURLCallback],
  );

  useEffect(() => {
    void Linking.getInitialURL().then(onUrl);
    const sub = Linking.addEventListener("url", ({ url }) => {
      void onUrl(url);
    });
    return () => sub.remove();
  }, [onUrl]);

  return null;
}
