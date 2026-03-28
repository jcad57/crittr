import FloatingBottomNav from "@/components/ui/navigation/FloatingBottomNav";
import { useAuth } from "@/context/auth";
import { useLoggedInQueryBootstrap } from "@/hooks/useLoggedInQueryBootstrap";
import { Redirect, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

function LoggedInQueryBootstrap() {
  useLoggedInQueryBootstrap();
  return null;
}

export default function LoggedInLayout() {
  const { isLoggedIn, needsOnboarding } = useAuth();

  if (!isLoggedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/(auth)/(onboarding)" />;
  }

  return (
    <View style={styles.shell}>
      <LoggedInQueryBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
      <View style={styles.navOverlay} pointerEvents="box-none">
        <FloatingBottomNav />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "transparent",
  },
  navOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
});
