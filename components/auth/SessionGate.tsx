import AppOpenAdManager from "@/components/ads/AppOpenAdManager";
import { Colors } from "@/theme/colors";
import { FONT_FACES } from "@/theme/fonts";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { proPricingQueryKey } from "@/hooks/queries/queryKeys";
import { configureRevenueCat } from "@/lib/iap/revenueCat";
import { queryClient } from "@/lib/queryClient";
import { startQueryCachePersistence } from "@/lib/queryPersistence";
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
import { useEffect, useRef, useState } from "react";
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
  const [cacheRestored, setCacheRestored] = useState(false);
  const initialized = useRef(false);

  /**
   * Restore before auth resolves and before the router mounts: screens read the
   * cache on their first render, so anything restored later would arrive after
   * they have already committed to a loading state.
   */
  useEffect(() => {
    let cancelled = false;
    void startQueryCachePersistence().finally(() => {
      if (!cancelled) setCacheRestored(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const isReady =
    (fontsLoaded || !!fontError) && cacheRestored && !isAuthLoading;

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
