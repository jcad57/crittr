import { SplashScreen } from "expo-router";
import SessionGate from "@/components/auth/SessionGate";
import { AuthProvider } from "@/context/auth";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SessionGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
