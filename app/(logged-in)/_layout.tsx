import PushNotificationBootstrap from "@/components/push/PushNotificationBootstrap";
import PushNotificationNavigationListener from "@/components/push/PushNotificationNavigationListener";
import ReminderNotificationSync from "@/components/push/ReminderNotificationSync";
import RevenueCatProSync from "@/components/iap/RevenueCatProSync";
import WebsiteUpgradeIntent from "@/components/iap/WebsiteUpgradeIntent";
import { ActivityMilestoneCelebrationHost } from "@/components/pro/ActivityMilestoneCelebrationHost";
import AppRatingPromptHost from "@/components/rating/AppRatingPromptHost";
import SeasonalBackdrop from "@/components/theme/SeasonalBackdrop";
import DashboardLoading from "@/components/ui/dashboard/DashboardLoading";
import FloatingBottomNav from "@/components/ui/navigation/FloatingBottomNav";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { useAuth } from "@/context/auth";
import { useLoggedInQueryBootstrap } from "@/hooks/useLoggedInQueryBootstrap";
import { Redirect, Stack, usePathname } from "expo-router";
import { StyleSheet, View } from "react-native";

function LoggedInQueryBootstrap() {
  useLoggedInQueryBootstrap();
  return null;
}

export default function LoggedInLayout() {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const { isLoggedIn, needsOnboarding, isHydrating } = useAuth();
  const pathname = usePathname() ?? "";
  const isAddPetRoute = pathname.includes("add-pet");
  /** Allow upgrade screen while onboarding (e.g. “Add another pet” → Pro) without leaving auth flow. */
  const isUpgradeRoute =
    pathname.includes("upgrade") ||
    pathname.includes("pro-checkout") ||
    pathname.includes("welcome-to-pro") ||
    pathname.includes("make-pro-yours");

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (isHydrating) {
    return <DashboardLoading />;
  }

  if (needsOnboarding && !isAddPetRoute && !isUpgradeRoute) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  return (
    <View style={styles.shell}>
      <SeasonalBackdrop />
      <PushNotificationBootstrap />
      <PushNotificationNavigationListener />
      <ReminderNotificationSync />
      <RevenueCatProSync />
      <WebsiteUpgradeIntent />
      <LoggedInQueryBootstrap />
      <ActivityMilestoneCelebrationHost />
      <AppRatingPromptHost />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: false,
          contentStyle: { backgroundColor: Colors.screenBackground },
        }}
      />
      <View style={styles.navOverlay} pointerEvents="box-none">
        <FloatingBottomNav />
      </View>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  navOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
  },
}));
