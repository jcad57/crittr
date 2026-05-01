import { Colors } from "@/constants/colors";
import { Tabs } from "expo-router";

/**
 * Main app surfaces (Home, Activity, Pets, Health). Uses the native tab navigator
 * so switching tabs does not run the root stack’s push/replace slide animation.
 * The real chrome is `FloatingBottomNav`.
 */
export default function LoggedInTabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneContainerStyle: { backgroundColor: Colors.splashBackground },
      }}
    />
  );
}
