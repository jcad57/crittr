import { Colors } from "@/theme/colors";
import { Tabs } from "expo-router";

/**
 * Main app surfaces (Home, Schedule, Pets, Health). Uses the native tab navigator
 * so switching tabs does not run the root stack’s push/replace slide animation.
 * The real chrome is `FloatingBottomNav`.
 */
export const unstable_settings = { initialRouteName: "dashboard" };

export default function LoggedInTabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        /**
         * Pre-mount tab scenes so the first Schedule tap is a JUMP_TO, not a
         * cold mount that builds the date strip on the critical path.
         */
        lazy: true,
        freezeOnBlur: true,
        sceneStyle: { backgroundColor: Colors.cream },
      }}
    >
      {/*
        Home must keep receiving React Query updates after sign-in. Freezing
        it during the auth → tabs transition left "Loading your dashboard…"
        on screen until the user switched tabs and back.
      */}
      <Tabs.Screen name="dashboard" options={{ freezeOnBlur: false }} />
    </Tabs>
  );
}
