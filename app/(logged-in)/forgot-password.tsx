import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Placeholder for the password reset flow. Wire navigation from here when the
 * reset screens are implemented.
 */
export default function ForgotPasswordPlaceholderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <View style={styles.navBar}>
        <Pressable
          style={styles.navButton}
          hitSlop={12}
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Forgot password
        </Text>
        <View style={styles.navButton} />
      </View>

      <View style={styles.body}>
        <Text style={styles.copy}>
          Password reset will open here in a future update. You’ll be able to
          receive a link to choose a new password.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  copy: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
