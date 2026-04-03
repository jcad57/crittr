import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * Back from verify-email: return to signup (step 0) and clear any partial auth state.
 */
export default function VerifyEmailBackHeader() {
  const goToStep = useOnboardingStore((s) => s.goToStep);
  const setEmailVerificationPending = useOnboardingStore(
    (s) => s.setEmailVerificationPending,
  );
  const signOut = useAuthStore((s) => s.signOut);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          setEmailVerificationPending(false);
          void signOut();
          goToStep(0);
        }}
        hitSlop={12}
        accessibilityLabel="Back to sign up"
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
