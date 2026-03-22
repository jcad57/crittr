import { FONT_FACES } from "@/constants/fonts";
import { useAuthStore } from "@/stores/authStore";
import { useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { useEffect, useRef } from "react";

export default function SessionGate() {
  const { isLoading: isAuthLoading, initialize } = useAuthStore();
  const [fontsLoaded, fontError] = useFonts(FONT_FACES);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initialize();
    }
  }, [initialize]);

  const isReady = (fontsLoaded || !!fontError) && !isAuthLoading;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return <Slot />;
}
