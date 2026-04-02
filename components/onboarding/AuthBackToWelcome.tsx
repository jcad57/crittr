import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

type AuthBackToWelcomeProps = {
  /** Run before navigating (e.g. reset onboarding store). */
  onBeforeNavigate?: () => void;
};

export default function AuthBackToWelcome({
  onBeforeNavigate,
}: AuthBackToWelcomeProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          onBeforeNavigate?.();
          router.replace("/(auth)/welcome");
        }}
        hitSlop={12}
        accessibilityLabel="Back to welcome"
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={Colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "flex-start",
  },
});
