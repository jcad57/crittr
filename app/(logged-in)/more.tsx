import { Colors } from "@/constants/colors";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MorePlaceholderScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 16,
          paddingBottom: scrollInsetBottom,
        },
      ]}
    >
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>
        Placeholder — settings, profile, and other tools.
      </Text>
      <Pressable
        onPress={() => router.push("/(logged-in)/(tabs)/profile")}
        style={styles.link}
      >
        <Text style={styles.linkText}>Open profile (existing screen)</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  link: {
    marginTop: 20,
    alignSelf: "flex-start",
  },
  linkText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 16,
    color: Colors.orange,
  },
  back: {
    marginTop: 16,
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 16,
    color: Colors.gray500,
  },
});
