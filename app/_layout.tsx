import AdMobBootstrap from "@/components/ads/AdMobBootstrap";
import SessionGate from "@/components/auth/SessionGate";
import { Colors } from "@/constants/colors";
import { SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <View style={styles.root}>
          <StatusBar style="dark" />
          <AdMobBootstrap />
          <SessionGate />
        </View>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.splashBackground,
  },
});
