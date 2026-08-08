import { Colors } from "@/constants/colors";
import { Tabs } from "expo-router";

/**
 * Main app surfaces (Home, Schedule, Pets, Health). Uses the native tab navigator
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
        /**
         * Pre-mount tab scenes so the first Schedule tap is a JUMP_TO, not a
         * cold mount that builds the date strip on the critical path.
         */
        lazy: false,
        freezeOnBlur: true,
        sceneContainerStyle: { backgroundColor: Colors.cream },
      }}
    />
  );
}
