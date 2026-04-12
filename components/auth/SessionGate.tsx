import StripeUrlHandler from "@/components/stripe/StripeUrlHandler";
import { FONT_FACES } from "@/constants/fonts";
import { queryClient } from "@/lib/queryClient";
import { setupReactQueryFocusManager } from "@/lib/reactQueryFocusManager";
import { setupSupabaseAuthAutoRefresh } from "@/lib/supabaseAuthAppState";
import { useAuthStore } from "@/stores/authStore";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { useEffect, useRef } from "react";

setupReactQueryFocusManager();

const stripePublishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export default function SessionGate() {
  const { isLoading: isAuthLoading, initialize } = useAuthStore();
  const [fontsLoaded, fontError] = useFonts({
    ...FONT_FACES,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initialize();
    }
  }, [initialize]);

  useEffect(() => {
    return setupSupabaseAuthAutoRefresh();
  }, []);

  const isReady = (fontsLoaded || !!fontError) && !isAuthLoading;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <StripeProvider
      publishableKey={stripePublishableKey}
      urlScheme="crittr"
    >
      <QueryClientProvider client={queryClient}>
        <StripeUrlHandler />
        <Slot />
      </QueryClientProvider>
    </StripeProvider>
  );
}
