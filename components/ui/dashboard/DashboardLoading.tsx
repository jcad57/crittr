import { Colors } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Same gradient as WelcomeContent */
const GRADIENT_COLORS = ["#FDB97E", "#F4845F", "#F27059"] as const;

export default function DashboardLoading() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[...GRADIENT_COLORS]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.white} />
        <Text style={styles.label}>Loading your dashboard…</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 16,
    color: Colors.white,
    textAlign: "center",
  },
});
