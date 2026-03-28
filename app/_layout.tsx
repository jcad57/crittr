import SessionGate from "@/components/auth/SessionGate";
import { SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionGate />
    </SafeAreaProvider>
  );
}
