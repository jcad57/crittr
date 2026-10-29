import AdMobBootstrap from "@/components/ads/AdMobBootstrap";
import FirebaseAnalyticsBootstrap from "@/components/analytics/FirebaseAnalyticsBootstrap";
import SessionGate from "@/components/auth/SessionGate";
import SeasonalThemeBootstrap from "@/components/theme/SeasonalThemeBootstrap";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { DefaultTheme, SplashScreen, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  return (
    <SafeAreaProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <View style={styles.root}>
          <SeasonalThemeBootstrap />
          <StatusBar style="dark" />
          <AdMobBootstrap />
          <FirebaseAnalyticsBootstrap />
          <ThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Colors.screenBackground, card: Colors.cream, text: Colors.textPrimary, border: Colors.creamDark, primary: Colors.orange } }}>
            <SessionGate />
          </ThemeProvider>
        </View>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.splashBackground,
  },
}));
