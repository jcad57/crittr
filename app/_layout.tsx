import AdMobBootstrap from "@/components/ads/AdMobBootstrap";
import SessionGate from "@/components/auth/SessionGate";
import { SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <StatusBar style="dark" />
        <AdMobBootstrap />
        <SessionGate />
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
