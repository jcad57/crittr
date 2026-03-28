import FormInput from "@/components/onboarding/FormInput";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import SocialAuthContainer from "@/components/onboarding/SocialAuthContainer";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import Divider from "@/components/ui/Divider";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/authStore";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Keyboard, Pressable, StyleSheet, Text } from "react-native";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { signInWithEmail } = useAuthStore();

  const handleSignIn = async () => {
    Keyboard.dismiss();
    try {
      await signInWithEmail(email, password);
      const { needsOnboarding } = useAuthStore.getState();
      if (needsOnboarding) {
        router.replace("/(auth)/(onboarding)");
      } else {
        router.replace("/(logged-in)/dashboard");
      }
    } catch (error: any) {
      Alert.alert("Sign In Failed", error.message ?? "Something went wrong.");
    }
  };

  return (
    <OnboardingCard>
      {/* Title */}
      <Text style={styles.title}>Welcome Back!</Text>

      <Text style={styles.socialLabel}>Sign in with</Text>
      <SocialAuthContainer />

      <Divider />

      {/* Email */}
      <FormInput
        icon="email-outline"
        placeholder="Email"
        value={email}
        onChangeText={(v) => setEmail(v)}
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.inputSpacing}
      />

      {/* Password */}
      <FormInput
        icon="lock-outline"
        placeholder="Password"
        value={password}
        onChangeText={(v) => setPassword(v)}
        secureTextEntry
        containerStyle={styles.inputSpacing}
      />

      {/* Sign In */}
      <OrangeButton
        onPress={handleSignIn}
        disabled={!email || !password}
        style={styles.cta}
      >
        Sign In
      </OrangeButton>
      <Link href="/(auth)/(onboarding)" asChild>
        <Pressable
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            justifyContent: "center",
          }}
        >
          <Text style={styles.signInLink}>Don't have an account? </Text>
          <Text style={styles.signInLinkBold}>Sign Up</Text>
        </Pressable>
      </Link>
    </OnboardingCard>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  socialLabel: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  inputSpacing: {
    marginBottom: 12,
  },
  terms: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  termsLink: {
    color: Colors.orange,
    fontFamily: "InstrumentSans-Bold",
  },
  cta: {
    marginTop: 12,
  },
  signInLabel: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  signInButton: {
    height: 50,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  signInLink: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  signInLinkBold: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
});
