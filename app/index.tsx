import { Colors } from "@/theme/colors";
import { useAuth } from "@/context/auth";
import { useAuthStore } from "@/stores/authStore";
import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  const { isLoggedIn, needsOnboarding, isHydrating } = useAuth();
  const requiresCoCareRemovedScreen = useAuthStore(
    (s) => s.requiresCoCareRemovedScreen,
  );

  if (isHydrating) {
    return (
      <View style={styles.hydrating}>
        <ActivityIndicator color={Colors.orange} />
      </View>
    );
  }

  if (isLoggedIn && !needsOnboarding) {
    return <Redirect href="/(logged-in)/(tabs)/dashboard" />;
  }

  if (isLoggedIn && needsOnboarding && requiresCoCareRemovedScreen) {
    return <Redirect href="/(auth)/(onboarding)/co-care-removed" />;
  }

  if (isLoggedIn && needsOnboarding) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  hydrating: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.splashBackground,
  },
});
