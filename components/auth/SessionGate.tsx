import LoginInterstitialManager from "@/components/ads/LoginInterstitialManager";
import ScreenViewTracker from "@/components/analytics/ScreenViewTracker";
import { createThemeValues, useSeasonalTheme, useThemeValues } from "@/theme/colors";
import { FONT_FACES } from "@/theme/fonts";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { proPricingQueryKey } from "@/lib/query/keys";
import { configureRevenueCat } from "@/lib/iap/revenueCat";
import { queryClient } from "@/lib/query/client";
import { fetchProPricing } from "@/services/proPricing";
import { ensureAppRatingFirstOpenRecorded } from "@/lib/appRatingPersistence";
import { setupAppResumeHandler } from "@/lib/appResumeHandler";
import { useAuthStore } from "@/stores/authStore";
import * as WebBrowser from "expo-web-browser";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export default function SessionGate() {
  const { hydrated: themeHydrated } = useSeasonalTheme();
  const styles = useThemeValues(getStyles);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const initialize = useAuthStore((s) => s.initialize);
  const [fontsLoaded, fontError] = useFonts(FONT_FACES);
  const initializationError = useAuthStore((s) => s.initializationError);
  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    return setupAppResumeHandler();
  }, []);

  useEffect(() => {
    void ensureAppRatingFirstOpenRecorded();
  }, []);

  useEffect(() => {
    void configureRevenueCat();
  }, []);

  const isReady = themeHydrated && (fontsLoaded || !!fontError) && !isAuthLoading;

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

  if (initializationError)
    return (
      <View
        style={[
          styles.bootPlaceholder,
          { justifyContent: "center", padding: 32 },
        ]}
      >
        <Text>{initializationError}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void initialize();
          }}
        >
          <Text>Retry</Text>
        </Pressable>
      </View>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <LoginInterstitialManager />
      <ScreenViewTracker />
      <Slot />
    </QueryClientProvider>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  bootPlaceholder: {
    flex: 1,
    backgroundColor: Colors.splashBackground,
  },
}));
