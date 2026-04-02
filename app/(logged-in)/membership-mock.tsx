import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useCrittrProStore } from "@/stores/crittrProStore";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Placeholder for future Stripe checkout. Sets mock Pro flag and returns home.
 */
export default function MembershipMockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const setMockPro = useCrittrProStore((s) => s.setMockPro);

  const onContinue = () => {
    setMockPro(true);
    router.replace("/(logged-in)/dashboard");
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <View style={[styles.body, { paddingBottom: scrollInsetBottom + 24 }]}>
        <Text style={styles.title}>Crittr Pro</Text>
        <Text style={styles.lead}>
          This is a mock checkout. In production, Stripe would open here to
          complete your subscription.
        </Text>
        <Text style={styles.note}>
          For testing, continuing marks your account as Pro in this session so
          you can add pets without the upgrade gate.
        </Text>

        <OrangeButton onPress={onContinue}>Continue</OrangeButton>
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
  back: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
  },
  note: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
});
