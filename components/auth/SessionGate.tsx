import { useAuth } from "@/context/auth";
import { FONT_FACES } from "@/constants/fonts";
import { useFonts } from "expo-font";
import { Slot, SplashScreen } from "expo-router";
import { useEffect } from "react";

export default function SessionGate() {
  const { isLoading: isAuthLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts(FONT_FACES);
  const isReady = (fontsLoaded || !!fontError) && !isAuthLoading;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return <Slot />;
}
