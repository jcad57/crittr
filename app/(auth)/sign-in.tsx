import AuthBackToWelcome from "@/components/onboarding/AuthBackToWelcome";
import FormInput from "@/components/onboarding/FormInput";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import SocialAuthContainer from "@/components/onboarding/SocialAuthContainer";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import Divider from "@/components/ui/Divider";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
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
    <OnboardingCard header={<AuthBackToWelcome />}>
      <Text style={authOnboardingStyles.screenTitle}>Welcome Back!</Text>

      <Text style={authOnboardingStyles.socialLabel}>Sign in with</Text>
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
      <Link href="/(auth)/(onboarding)?intent=signup" asChild>
        <Pressable style={authOnboardingStyles.linkRow}>
          <Text style={authOnboardingStyles.linkMuted}>
            Don&apos;t have an account?{" "}
          </Text>
          <Text style={authOnboardingStyles.linkAccent}>Sign Up</Text>
        </Pressable>
      </Link>
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  inputSpacing: {
    marginBottom: 12,
  },
  cta: {
    marginTop: 12,
  },
});
