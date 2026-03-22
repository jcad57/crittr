import SessionGate from "@/components/auth/SessionGate";
import { SplashScreen } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionGate />
    </SafeAreaProvider>
  );
}
