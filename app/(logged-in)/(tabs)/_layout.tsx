import { useThemeColors } from "@/theme/colors";
import { Tabs } from "expo-router";

/**
 * Main app surfaces (Home, Schedule, Pets, Health). Uses the native tab navigator
 * so switching tabs does not run the root stack’s push/replace slide animation.
 * The real chrome is `FloatingBottomNav`.
 */
export const unstable_settings = { initialRouteName: "dashboard" };

export default function LoggedInTabsLayout() {
  const Colors = useThemeColors();
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        // Mount each screen on first visit to keep sign-in lightweight.
        lazy: true,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: Colors.screenBackground },
      }}
    >
      {/*
        Home must keep receiving React Query updates after sign-in. Freezing
        it during the auth → tabs transition left "Loading your dashboard…"
        on screen until the user switched tabs and back.
      */}
      <Tabs.Screen name="dashboard" options={{ freezeOnBlur: false }} />
      {/* SDK 58 redirects undeclared tab routes to the initial tab. */}
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="pets" />
      <Tabs.Screen name="health" />
    </Tabs>
  );
}
