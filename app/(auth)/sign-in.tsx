import AuthBackToWelcome from "@/components/onboarding/AuthBackToWelcome";
import FormInput from "@/components/onboarding/FormInput";
import OnboardingCard from "@/components/onboarding/OnboardingCard";
import SocialAuthContainer from "@/components/onboarding/SocialAuthContainer";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { SHOW_GOOGLE_AUTH_ON_EMAIL_SCREENS } from "@/constants/authUi";
import {
  getAuthFlowColumnOuterWidth,
  welcomeAuthLayoutScale,
} from "@/hooks/useResponsiveUi";
import { getSigninMethodHint } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Keyboard,
  Pressable,
  Image as RNImage,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

function looksLikeInvalidPasswordAttempt(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("invalid login") ||
    m.includes("invalid credentials") ||
    m.includes("invalid grant")
  );
}

function mapSignInError(message: string): string {
  const m = message.toLowerCase();
  if (looksLikeInvalidPasswordAttempt(message)) {
    return "Incorrect email or password. Check your details and try again.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  return message.trim() || "Something went wrong. Please try again.";
}

const ANIMALS_PEAKING = require("@/assets/images/animals-peaking.png");
const ANIMALS_PEAKING_RESOLVED = RNImage.resolveAssetSource(ANIMALS_PEAKING);
const ANIMALS_PEAKING_ASPECT =
  ANIMALS_PEAKING_RESOLVED?.width && ANIMALS_PEAKING_RESOLVED.width > 0
    ? ANIMALS_PEAKING_RESOLVED.height / ANIMALS_PEAKING_RESOLVED.width
    : 1;

function SignInGoogleBlock({
  signingIn,
  setAuthError,
}: {
  signingIn: boolean;
  setAuthError: (value: string | null) => void;
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const handleGoogleSignIn = async () => {
    Keyboard.dismiss();
    setAuthError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setAuthError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Text style={authOnboardingStyles.socialLabel}>Sign in with</Text>
      <SocialAuthContainer
        onGooglePress={handleGoogleSignIn}
        googleLoading={googleLoading}
        googleDisabled={signingIn}
      />
    </>
  );
}

export default function SignIn() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { uiScale, verticalTight } = welcomeAuthLayoutScale(
    windowWidth,
    windowHeight,
  );
  const vs = (n: number) => Math.round(n * uiScale * verticalTight);

  const authColumnOuter = getAuthFlowColumnOuterWidth(windowWidth);
  const HERO_SCALE = 0.8;
  const heroWidth = Math.min(authColumnOuter * 0.52, 220) * HERO_SCALE;
  const heroHeight = heroWidth * ANIMALS_PEAKING_ASPECT;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);

  const handleSignIn = async () => {
    Keyboard.dismiss();
    setAuthError(null);
    setEmailError(null);
    setPasswordError(null);

    const trimmedEmail = email.trim();
    let invalid = false;

    if (!trimmedEmail) {
      setEmailError("Please enter your email.");
      invalid = true;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      invalid = true;
    }
    if (invalid) return;

    setSigningIn(true);
    try {
      await signInWithEmail(trimmedEmail, password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (trimmedEmail && looksLikeInvalidPasswordAttempt(msg)) {
        const hint = await getSigninMethodHint(trimmedEmail);
        if (hint === "google") {
          setAuthError(
            SHOW_GOOGLE_AUTH_ON_EMAIL_SCREENS
              ? "This account was set up with Google. Use the Google button above to sign in."
              : "This account was set up with Google. Google sign-in is temporarily unavailable—please try again soon or contact support.",
          );
        } else {
          setAuthError(mapSignInError(msg));
        }
      } else {
        setAuthError(mapSignInError(msg));
      }
    } finally {
      setSigningIn(false);
    }
  };

  const emailHasErr = Boolean(emailError);
  const passwordHasErr = Boolean(passwordError);
  const authFailed = Boolean(authError);

  return (
    <OnboardingCard
      header={<AuthBackToWelcome />}
      centerContent
      welcomeBackground
    >
      <Text style={authOnboardingStyles.screenTitle}>Welcome Back!</Text>

      {SHOW_GOOGLE_AUTH_ON_EMAIL_SCREENS ? (
        <SignInGoogleBlock signingIn={signingIn} setAuthError={setAuthError} />
      ) : (
        <Text style={authOnboardingStyles.screenSubtitle}>
          Sign in with your email and password
        </Text>
      )}

      <View
        style={[
          styles.peekSection,
          {
            marginTop: SHOW_GOOGLE_AUTH_ON_EMAIL_SCREENS ? vs(32) : vs(20),
            marginBottom: vs(-5),
          },
        ]}
      >
        <Image
          source={ANIMALS_PEAKING}
          style={{ width: heroWidth, height: heroHeight, opacity: 0.85 }}
          contentFit="contain"
          accessibilityRole="image"
          accessibilityLabel="Decorative animals above the divider"
        />
      </View>

      <FormInput
        icon="email-outline"
        placeholder="Email"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          setEmailError(null);
          setAuthError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        containerStyle={styles.inputSpacing}
        error={emailHasErr || authFailed}
        errorMessage={emailError ?? undefined}
      />

      <FormInput
        icon="lock-outline"
        placeholder="Password"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          setPasswordError(null);
          setAuthError(null);
        }}
        secureTextEntry
        containerStyle={styles.inputSpacing}
        error={passwordHasErr || authFailed}
        errorMessage={passwordError || authError || undefined}
      />

      <OrangeButton
        onPress={handleSignIn}
        loading={signingIn}
        style={styles.cta}
      >
        Sign In
      </OrangeButton>
      <Pressable
        style={authOnboardingStyles.linkRow}
        onPress={() =>
          router.replace("/(auth)/(onboarding)?intent=signup")
        }
      >
        <Text style={authOnboardingStyles.linkMuted}>
          Don&apos;t have an account?{" "}
        </Text>
        <Text style={authOnboardingStyles.linkAccent}>Sign Up</Text>
      </Pressable>
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  peekSection: {
    width: "100%",
    alignItems: "center",
    overflow: "visible",
  },
  inputSpacing: {
    marginBottom: 12,
  },
  cta: {
    marginTop: 12,
  },
});
