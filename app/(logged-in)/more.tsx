import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MorePlaceholderScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push, router } = useNavigationCooldown();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + 8,
          paddingBottom: scrollInsetBottom,
        },
      ]}
    >
      <Text style={styles.title}>More</Text>
      <Text style={styles.subtitle}>
        Placeholder — settings, profile, and other tools.
      </Text>
      <Pressable
        onPress={() => push("/(logged-in)/profile")}
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
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  link: {
    marginTop: 20,
    alignSelf: "flex-start",
  },
  linkText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  back: {
    marginTop: 16,
    alignSelf: "flex-start",
  },
  backText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.gray500,
  },
});
