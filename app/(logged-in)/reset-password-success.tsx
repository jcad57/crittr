import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HIGH_FIVE = require("@/assets/images/high-five.png");

export default function ResetPasswordSuccessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleDone = () => {
    if (router.canDismiss()) {
      router.dismissTo("/(logged-in)/profile" as Href);
    } else {
      router.replace("/(logged-in)/profile" as Href);
    }
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.body}>
        <View style={styles.heroImageWrap}>
          <Image
            source={HIGH_FIVE}
            style={styles.heroImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <Text style={styles.title}>Password updated!</Text>
        <Text style={styles.subtitle}>
          Your password has been reset successfully. Next time you sign in,
          use your new password.
        </Text>
      </View>

      <View style={styles.footer}>
        <OrangeButton onPress={handleDone}>Back to profile</OrangeButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImageWrap: {
    alignItems: "center",
    marginBottom: 32,
  },
  heroImage: {
    width: 200,
    height: 160,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  footer: {
    paddingTop: 16,
  },
});
