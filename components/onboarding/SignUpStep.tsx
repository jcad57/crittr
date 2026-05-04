import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { SHOW_GOOGLE_AUTH_ON_EMAIL_SCREENS } from "@/constants/authUi";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useAuthStore } from "@/stores/authStore";
import { ONBOARDING_STEPS, useOnboardingStore } from "@/stores/onboardingStore";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useShallow } from "zustand/react/shallow";
import Divider from "../ui/Divider";
import SocialAuthContainer from "./SocialAuthContainer";

function SignUpGoogleBlock({ isSubmitting }: { isSubmitting: boolean }) {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const { setEmailVerificationPending, setProfileBackAfterProfile } =
    useOnboardingStore(
      useShallow((s) => ({
        setEmailVerificationPending: s.setEmailVerificationPending,
        setProfileBackAfterProfile: s.setProfileBackAfterProfile,
      })),
    );
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setEmailVerificationPending(false);
    setProfileBackAfterProfile("signup");
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      Alert.alert("Google sign-up", msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Text style={[authOnboardingStyles.socialLabel, { marginBottom: 16 }]}>
        Sign up with
      </Text>
      <SocialAuthContainer
        onGooglePress={handleGoogleSignUp}
        googleLoading={googleLoading}
        googleDisabled={isSubmitting}
      />
      <Divider />
    </>
  );
}

export default function SignUpStep() {
  const router = useRouter();
  const {
    accountData,
    setAccountData,
    goToStep,
    setEmailVerificationPending,
    setProfileBackAfterProfile,
  } = useOnboardingStore(
    useShallow((s) => ({
      accountData: s.accountData,
      setAccountData: s.setAccountData,
      goToStep: s.goToStep,
      setEmailVerificationPending: s.setEmailVerificationPending,
      setProfileBackAfterProfile: s.setProfileBackAfterProfile,
    })),
  );
  const signUp = useAuthStore((s) => s.signUp);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const canSubmit =
    accountData.firstName.trim() &&
    accountData.lastName.trim() &&
    accountData.email.trim() &&
    accountData.password.length >= 6;

  const firstErr = attempted && !accountData.firstName.trim();
  const lastErr = attempted && !accountData.lastName.trim();
  const emailErr = attempted && !accountData.email.trim();
  const passwordErr = attempted && accountData.password.length < 6;

  const handleCreateAccount = async () => {
    if (!canSubmit) {
      setAttempted(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const { needsEmailVerification } = await signUp(
        accountData.email.trim(),
        accountData.password,
        accountData.firstName.trim(),
        accountData.lastName.trim(),
      );
      if (needsEmailVerification) {
        setEmailVerificationPending(true);
        setProfileBackAfterProfile(null);
        goToStep(ONBOARDING_STEPS.indexOf("verify-email"));
      } else {
        setProfileBackAfterProfile("signup");
        goToStep(ONBOARDING_STEPS.indexOf("profile"));
      }
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.message ?? "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={authOnboardingStyles.screenTitle}>Welcome to Crittr!</Text>

      {/* Animal icons */}
      <View style={styles.iconRow}>
        <Image
          source={require("@/assets/icons/cat-icon.png")}
          style={styles.icon}
        />
        <Image
          source={require("@/assets/icons/dog-icon.png")}
          style={styles.icon}
        />
        <Image
          source={require("@/assets/icons/fishbowl-icon.png")}
          style={styles.icon}
        />
      </View>

      {SHOW_GOOGLE_AUTH_ON_EMAIL_SCREENS ? (
        <SignUpGoogleBlock isSubmitting={isSubmitting} />
      ) : (
        <Text
          style={[authOnboardingStyles.screenSubtitle, { marginBottom: 20 }]}
        >
          Fill out some details to get started{" "}
        </Text>
      )}

      {/* Name row */}
      <View style={styles.nameRow}>
        <FormInput
          label="First name"
          required
          placeholder="First Name"
          value={accountData.firstName}
          onChangeText={(v) => setAccountData({ firstName: v })}
          containerStyle={styles.halfInput}
          autoCapitalize="words"
          error={firstErr}
        />
        <FormInput
          label="Last name"
          required
          placeholder="Last Name"
          value={accountData.lastName}
          onChangeText={(v) => setAccountData({ lastName: v })}
          containerStyle={styles.halfInput}
          autoCapitalize="words"
          error={lastErr}
        />
      </View>

      {/* Email */}
      <FormInput
        label="Email"
        required
        icon="email-outline"
        placeholder="Email"
        value={accountData.email}
        onChangeText={(v) => setAccountData({ email: v })}
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.inputSpacing}
        error={emailErr}
      />

      {/* Password */}
      <FormInput
        label="Password"
        required
        icon="lock-outline"
        placeholder="At least 6 characters"
        value={accountData.password}
        onChangeText={(v) => setAccountData({ password: v })}
        secureTextEntry
        containerStyle={styles.inputSpacing}
        error={passwordErr}
      />

      {/* Terms */}
      <Pressable
        onPress={() => router.push("/(auth)/terms-of-service")}
        style={styles.termsPressable}
      >
        <Text style={authOnboardingStyles.terms}>
          I agree to the{" "}
          <Text style={authOnboardingStyles.termsLink}>Terms of Service</Text>
        </Text>
      </Pressable>

      {attempted && !canSubmit ? (
        <Text style={styles.errorHint}>
          Please fill in all required fields. Password must be at least 6
          characters.
        </Text>
      ) : null}

      {/* Create Account */}
      <OrangeButton
        onPress={handleCreateAccount}
        loading={isSubmitting}
        style={styles.cta}
      >
        Create Account
      </OrangeButton>

      {/* Same layout + copy as welcome screen: inline “Sign In” link */}
      <Pressable
        style={styles.signInRow}
        onPress={() => router.replace("/(auth)/sign-in")}
      >
        <Text style={styles.signInLink}>I already have an account! </Text>
        <Text style={styles.signInLinkBold}>Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 20,
  },
  icon: {
    width: 24,
    height: 24,
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
  cta: {
    marginTop: 12,
    marginBottom: 22,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  signInLink: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  signInLinkBold: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.orange,
  },
  errorHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  termsPressable: {
    alignSelf: "center",
  },
});
