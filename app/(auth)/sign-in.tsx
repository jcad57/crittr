import AuthBackToWelcome from "@/components/onboarding/AuthBackToWelcome";
import FormInput from "@/components/onboarding/FormInput";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import SocialAuthContainer from "@/components/onboarding/SocialAuthContainer";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import Divider from "@/components/ui/Divider";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { useAuthStore } from "@/stores/authStore";
import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Keyboard, Pressable, StyleSheet, Text } from "react-native";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const { signInWithEmail } = useAuthStore();

  const handleSignIn = async () => {
    Keyboard.dismiss();
    setSigningIn(true);
    try {
      await signInWithEmail(email, password);
      // Routing is handled automatically by auth state change in the layout
      // redirects (AuthLayout / LoggedInLayout). No manual navigation needed.
    } catch (error: any) {
      Alert.alert("Sign In Failed", error.message ?? "Something went wrong.");
    } finally {
      setSigningIn(false);
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
        loading={signingIn}
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
