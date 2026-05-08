import AppOpenAdManager from "@/components/ads/AppOpenAdManager";
import { Colors } from "@/constants/colors";
import { FONT_FACES } from "@/constants/fonts";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { proPricingQueryKey } from "@/hooks/queries/queryKeys";
import { configureRevenueCat } from "@/lib/iap/revenueCat";
import { queryClient } from "@/lib/queryClient";
import { fetchProPricing } from "@/services/proPricing";
import { setupAppResumeHandler } from "@/lib/appResumeHandler";
import { setupReactQueryFocusManager } from "@/lib/reactQueryFocusManager";
import { setupSupabaseAuthAutoRefresh } from "@/lib/supabaseAuthAppState";
import { useAuthStore } from "@/stores/authStore";
import * as WebBrowser from "expo-web-browser";
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
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

setupReactQueryFocusManager();

WebBrowser.maybeCompleteAuthSession();

export default function SessionGate() {
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
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

  useEffect(() => {
    return setupAppResumeHandler();
  }, []);

  useEffect(() => {
    void configureRevenueCat();
  }, []);

  const isReady = (fontsLoaded || !!fontError) && !isAuthLoading;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    void queryClient.prefetchQuery({
      queryKey: proPricingQueryKey,
      queryFn: async () => (await fetchProPricing()) ?? PRO_PRICING_FALLBACK,
    });
  }, [isReady]);

  if (!isReady) {
    return <View style={styles.bootPlaceholder} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppOpenAdManager />
      <Slot />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  bootPlaceholder: {
    flex: 1,
    backgroundColor: Colors.splashBackground,
  },
});
